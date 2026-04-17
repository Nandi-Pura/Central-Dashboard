import Head from "next/head";
import Dashboard from "../components/Dashboard";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Aruba Monitoring Dashboard</title>
        <meta name="description" content="Local Aruba Central network dashboard" />
      </Head>
      <Dashboard />
    </>
  );
}
