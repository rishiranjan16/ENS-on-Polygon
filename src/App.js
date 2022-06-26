import React, { useEffect, useState } from "react";
import "./styles/App.css";
import twitterLogo from "./assets/twitter-logo.svg";
import { ethers } from "ethers";
import contractAbi from "./utils/contractABI.json";
import polygonLogo from "./assets/polygonlogo.png";
import ethLogo from "./assets/ethlogo.png";
import { networks } from "./utils/networks";

// Constants
const TWITTER_HANDLE = "rishiweb3";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const tld = ".hodl";
const CONTRACT_ADDRESS = "0x0FB34a1652c6Ea723458208C0b24E7bAf9c189B7";

const App = () => {
  const [network, setNetwork] = useState(""); //to store network

  const [currentAccount, setCurrentAccount] = useState("");
  const [domain, setDomain] = useState("");
  const [record, setRecord] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mints, setMints] = useState([]);

  // Implement your connectWallet method here
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask -> https://metamask.io/");
        return;
      }

      // to request access to account
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      //getting the public address
      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        // try switching to the polygon mumbai testnet
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x13881" }], // this is the chain id for testnet of polygon
        });
      } catch (error) {
        // if metamask doesn't even have the chain id that we are asking for (polygon mumbai testnet )
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChian",
              params: [
                {
                  chianId: "0x13881",
                  chainName: "Polygon Mumbai Testnet",
                  rpcUrls: ["https://rpc-mumbai.maticvigil.com/"],
                  nativeCurrency: {
                    name: "Mumbai Matic",
                    symbol: "MATIC",
                    decimals: 18,
                  },
                  blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
                },
              ],
            });
          } catch (error) {
            console.log("error");
          }
        }
        console.log(error);
      }
    } else {
      // throw the error that metamask is not installed if window is not found ,ezzzz
      alert(
        "Metamask is not installed . Please Install it to use this app: https://metamask.io/download.html"
      );
    }
  };

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Make sure you have metamask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum);
    }

    const accounts = await ethereum.request({ method: "eth_accounts" });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      setCurrentAccount(account);
    } else {
      console.log("No authorized account found");
    }
    // to check the user's network chainId
    const chainId = await ethereum.request({ method: "eth_chainId" });
    setNetwork(networks[chainId]);
    ethereum.on("chainChanged", handleChainChanged);

    // reload when we change the network
    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  };
  const mintDomain = async () => {
    // Don't run if the domain is empty
    if (!domain) {
      return;
    }
    // Not let the user choose a domain less than 3 characters long
    if (domain.length < 3) {
      alert("Domain must be at least 3 characters long");
      return;
    }
    // Calculate price based on length of domain
    // For my contract it is 3 chars = 0.05 MATIC, 4 chars = 0.03 MATIC, 5 or more = 0.01 MATIC // so i have priced like this
    const price =
      domain.length === 3 ? "0.05" : domain.length === 4 ? "0.03" : "0.01";
    console.log("Minting domain", domain, "with price", price);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        console.log(price);
        let tx = await contract.register(domain, {
          value: ethers.utils.parseEther(price),
        });
        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // This checks if the transaction is successful / successfully mined
        if (receipt.status === 1) {
          console.log(
            "Domain minted! https://mumbai.polygonscan.com/tx/" + tx.hash
          );
          alert("Domain has been minted");

          // Set the record for the domain
          tx = await contract.setRecord(domain, record);
          await tx.wait();

          console.log(
            "Record set! https://mumbai.polygonscan.com/tx/" + tx.hash
          );
          // it calls fetchmint function after 2 seconds
          setTimeout(() => {
            fetchMints();
          }, 2000);

          setRecord("");
          setDomain("");
        } else {
          alert("Transaction failed! Please try again");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMints = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        //getting the domain names from the contract
        const names = await contract.getAllNames();

        //getting recording and address for each name
        const mintRecords = await Promise.all(
          names.map(async (name) => {
            const mintRecord = await contract.records(name);
            const owner = await contract.domains(name);
            return {
              id: name.indexOf(name),
              name: name,
              record: mintRecord,
              owner: owner,
            };
          })
        );
        console.log("MINTS FETCHED", mintRecords);
        setMints(mintRecords);
      }
    } catch (error) {
      console.log(error);
    }
  };
  // it will run any time the current account or network is /are changed
  useEffect(() => {
    if (network === "Polygon Mumbai Testnet") {
      fetchMints();
    }
  }, [currentAccount, network]);

  const updateDomain = async () => {
    if (!record || !domain) {
      return;
    }
    setLoading(true);
    console.log("Updating domain", domain, "with record", record);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        let tx = await contract.setRecord(domain, record);
        await tx.wait();
        console.log(
          "Record set , check here : https://mumbai.polygonscan.com/tx/" +
            tx.hash
        );

        fetchMints();
        setRecord("");
        setDomain("");
      }
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  // Add this render function next to your other render functions
  const renderMints = () => {
    if (currentAccount && mints.length > 0) {
      return (
        <div className='mint-container'>
          <p className='subtitle'> Recently minted domains!</p>
          <div className='mint-list'>
            {mints.map((mint, index) => {
              return (
                <div className='mint-item' key={index}>
                  <div className='mint-row'>
                    <a
                      className='link'
                      href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <p className='underlined'>
                        {" "}
                        {mint.name}
                        {tld}{" "}
                      </p>
                    </a>
                    {/* If mint.owner is currentAccount, add an "edit" button*/}
                    {mint.owner.toLowerCase() ===
                    currentAccount.toLowerCase() ? (
                      <button
                        className='edit-button'
                        onClick={() => editRecord(mint.name)}
                      >
                        <img
                          className='edit-icon'
                          src='https://img.icons8.com/metro/26/000000/pencil.png'
                          alt='Edit button'
                        />
                      </button>
                    ) : null}
                  </div>
                  <p> {mint.record} </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  // This will take us into edit mode and show us the edit buttons!
  const editRecord = (name) => {
    console.log("Editing record for", name);
    setEditing(true);
    setDomain(name);
  };

  // to render things
  const renderNotConnectedContainer = () => (
    <div className='connect-wallet-container'>
      <img
        src='https://media.giphy.com/media/i9TNKykku4tVVsyVhh/giphy.gif'
        alt='Hodl gif'
      />

      <button
        onClick={connectWallet}
        className='cta-button connect-wallet-button'
      >
        Connect Wallet
      </button>
    </div>
  );

  const renderInputForm = () => {
    // Renders msg: connect to Polygon Mumbai testnet, if not already connected
    if (network !== "Polygon Mumbai Testnet") {
      return (
        <div className='connect-wallet-container'>
          <p> Please Connect to Polygon Mumbai Testnet </p>
          <button className='cta-button mint-button' onClick={switchNetwork}>
            Switch Network{" "}
          </button>
        </div>
      );
    }
    return (
      <div className='form-container'>
        <div className='first-row'>
          <input
            type='text'
            value={domain}
            placeholder='domain'
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className='tld'> {tld} </p>
        </div>

        <input
          type='text'
          value={record}
          placeholder='what do you wanna hodl?'
          onChange={(e) => setRecord(e.target.value)}
        />
        {editing ? (
          <div className='button-container'>
            <button
              className='cta-button mint-button'
              disabled={loading}
              onClick={updateDomain}
            >
              Set Record
            </button>
            <button
              className='cta-button mint-button'
              onCLick={() => {
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className='cta-button mint-button'
            disabled={loading}
            onClick={mintDomain}
          >
            Mint
          </button>
        )}
      </div>
    );
  };
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  return (
    <div className='App'>
      <div className='container'>
        <div className='header-container'>
          <header>
            <div className='left'>
              <p className='title'>🚀HODL Name Service - HNS</p>
              <p className='subtitle'>Don't Fomo , Just HODL✅</p>
            </div>
            <div className='right'>
              <img
                alt='Network logo'
                className='logo'
                src={network.includes("Polygon") ? polygonLogo : ethLogo}
              />
              {currentAccount ? (
                <p>
                  {" "}
                  Wallet: {currentAccount.slice(0, 6)}...
                  {currentAccount.slice(-4)}
                </p>
              ) : (
                <p> Not Connected to Wallet</p>
              )}
            </div>
          </header>
        </div>

        {!currentAccount && renderNotConnectedContainer()}
        {currentAccount && renderInputForm()}
        {mints && renderMints()}

        <div className='footer-container'>
          <img alt='Twitter Logo' className='twitter-logo' src={twitterLogo} />
          <a
            className='footer-text'
            href={TWITTER_LINK}
            target='_blank'
            rel='noreferrer'
          >{`built by @${TWITTER_HANDLE} with 🧡`}</a>
        </div>
      </div>
    </div>
  );
};
export default App;
