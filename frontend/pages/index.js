import Head from "next/head";
import styles from "../styles/Home.module.css";
import Web3Modal from "web3modal";
import { providers, Contract, utils } from "ethers";
import { useEffect, useRef, useState } from "react";
import { MY_CONTRACT_ADDRESS, abi } from "../constants";

/*
Everything works ok, but I get this error in my metamask wallet when using this code:
"We noticed that the current website tried to use the removed window.web3 API. 
If the site appears to be broken, please click here for more information."

What can we do to remove this error? I think it's because I'm using web3modal, but I'm not sure.
https://github.com/MetaMask/metamask-extension/issues/10408#issuecomment-775966822
https://docs.metamask.io/wallet/how-to/migrate-api/#replace-windowweb3
*/

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donationReason, setDonationReason] = useState("dd");
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

      // 1 ***********************************
      // // get the emitted event
      // const receipt = await tx.wait();
      // setLoading(false);
      // // ** what's the difference between logs data and event args and topics? **
      // //     ** when should I use which?  **
      // const data = receipt.logs[0].data;
      // console.log(data);

      // console.log(receipt.events[0].args); // ** what is json.stringify **
      // // console.log(
      // //   JSON.stringify(receipt.events[0].args.newSentence.toString())
      // // );
      // ***********************************

      // 2 ***********************************
      // ** what's the difference between getting events via receipt (above) vs donationContract.on() (below)? **
      // ** when using  donationContract.on() the browser console doesn't show anything the first time. Any idea why? **
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
          console.log(JSON.stringify(info, null, 4)); // ** what does 4 do here? **
          alert(`Thank you for your donation of ${amount} Wei!`);
        }
      );
      // ***********************************
    } catch (err) {
      console.error(err);
    }
  };

  // get filtered events where the donation amount is greater than 10 wei
  const getDonationEvents = async () => {
    try {
      const provider = await getProviderOrSigner(); // ** When do I need to include true in the parenthesis? **
      // ** Can I use the same const donationContract variable or do i need to make it a let type?  **
      //     ** I guess the above is more of a js question. Can the same const variables be used multiple times?  **
      const donationContract = new Contract(MY_CONTRACT_ADDRESS, abi, provider);
      const filter = donationContract.filters.LogData(null, null, null, null);
      const events = await donationContract.queryFilter(filter);
      const filteredEvents = events.filter((event) => event.args.amount > 10);
      // write a for loop to print out the filtered events and convert the hex donation number to its equivalent integer
      for (let i = 0; i < filteredEvents.length; i++) {
        const amounts = utils.formatUnits(
          filteredEvents[i].args[0]["_hex"],
          "wei"
        );
        console.log(amounts);
        console.log(filteredEvents[i].args[1]);
        console.log(filteredEvents[i].args[2]);
        console.log("----------------");
      }

      // console.log(filteredEvents); // ** why are there 2 topics in each array in the console? I can show you this when we meet. **
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
            A contract where you can donate to online educators.
          </div>
          <br></br>
          <div>
            <label>Reason of Donation: </label>
            <input
              type="text"
              value={donationReason}
              onChange={(e) => setDonationReason(e.target.value)}
              style={{ marginRight: ".5rem" }}
            />
            <br></br>
            <label>Donation Amount: </label>
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
              Get Donation Events
            </button>
          </div>
        </div>
      </div>
      <footer className={styles.footer}>Made with &#10084; by Adam</footer>
    </div>
  );
}
