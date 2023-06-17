import Head from "next/head";
import styles from "../styles/Home.module.css";
import Web3Modal from "web3modal";
import { providers, Contract, utils } from "ethers";
import { useEffect, useRef, useState } from "react";
import { MY_CONTRACT_ADDRESS, abi } from "../constants";

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donationReason, setDonationReason] = useState("");
  const [donationAmount, setDonationAmount] = useState(0);
  const web3ModalRef = useRef();

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Sepolia network, let them know by throwing an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 11155111) {
      window.alert("Change the network to Sepolia");
      throw new Error("Change network to Sepolia");
    }

    if (needSigner) {
      return web3Provider.getSigner();
    }
    return web3Provider;
  };

  useEffect(() => {
    const initializeWeb3Modal = () => {
      web3ModalRef.current = new Web3Modal({
        network: "sepolia",
        providerOptions: {},
        disableInjectedProvider: false,
      });
    };

    if (!walletConnected) {
      initializeWeb3Modal();
      connectWallet();
    }
  }, [walletConnected]);

  const setDonation = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      // Create a new instance of the Contract with a Signer
      const donationContract = new Contract(MY_CONTRACT_ADDRESS, abi, signer);
      // call the offerDonation function from the contract
      const tx = await donationContract.offerDonation(donationReason, {
        value: donationAmount, // donation is in wei
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);
      donationContract.on(
        "LogData",
        (amount, reason, donatorAddress, timestamp, event) => {
          let info = {
            amount: amount.toString(),
            reason: reason.toString(),
            donatorAddress: donatorAddress.toString(),
            timestamp: timestamp.toString(),
            data: event,
          };
          console.log(JSON.stringify(info, null, 4));
          alert(`Thank you for your donation of ${amount} Wei!`);
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const getDonationEvents = async () => {
    try {
      const provider = await getProviderOrSigner();
      const donationContract = new Contract(MY_CONTRACT_ADDRESS, abi, provider);
      const filter = donationContract.filters.LogData(null, null, null, null);
      const events = await donationContract.queryFilter(filter);
      const filteredEvents = events.filter((event) => event.args.amount > 45);
      for (let i = 0; i < filteredEvents.length; i++) {
        const weiAmount = utils.formatUnits(
          filteredEvents[i].args[0]["_hex"],
          "wei"
        );
        const eventTimestamp = new Date(filteredEvents[i].args[3] * 1000);

        console.log(eventTimestamp);
        console.log(`Amount: ${weiAmount}`);
        console.log(`Reason: ${filteredEvents[i].args[1]}`);
        console.log(`Donator's wallet address: ${filteredEvents[i].args[2]}`);
        console.log("----------------");
      }

      console.log(filteredEvents);
    } catch (err) {
      console.error(err);
    }
  };

  const renderButton = () => {
    if (walletConnected) {
      if (loading) {
        return <button className={styles.button}>Loading...</button>;
      } else {
        return (
          <button
            onClick={setDonation}
            style={{ cursor: "pointer", backgroundColor: "blue" }}
          >
            Submit
          </button>
        );
      }
    } else {
      return (
        <button
          style={{ cursor: "pointer", backgroundColor: "blue" }}
          onClick={connectWallet}
        >
          Connect your wallet
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Donation dApp</title>
        <meta name="description" content="Donation-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>
            Welcome to the Educator Donation dApp!
          </h1>
          <div className={styles.description}>
            A contract where you can thank and donate to online educators.
          </div>
          <br></br>
          <div>
            <label>Reason for donation: </label>
            <input
              type="text"
              value={donationReason}
              onChange={(e) => setDonationReason(e.target.value)}
              style={{ marginRight: ".5rem" }}
            />
            <br></br>
            <label>Donation amount (wei): </label>
            <input
              type="number"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              style={{ marginRight: ".5rem" }}
            />
            <br></br>
            {renderButton()}
          </div>
          <br></br>
          <div>
            <button
              onClick={getDonationEvents}
              style={{ cursor: "pointer", backgroundColor: "blue" }}
            >
              See donations over 45 wei
            </button>
          </div>
        </div>
      </div>
      <footer className={styles.footer}>Made with &#10084; by Adam</footer>
    </div>
  );
}
