import Head from "next/head";
import Dashboard from "../components/Dashboard";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Central NOC — Aruba Observability Dashboard</title>
        <meta name="description" content="Enterprise-grade Aruba Central network observability platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Dashboard />
    </>
  );
}
