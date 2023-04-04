import { ClerkProvider } from "@clerk/nextjs";
import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import { Toaster } from "react-hot-toast";
import Head from "next/head";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <ClerkProvider {...pageProps}>
      <Head>
        <title>Emojeer</title>
        <meta name="description" content="Chat with emojis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Toaster />
      <Component {...pageProps} />
    </ClerkProvider>
  )
};

export default api.withTRPC(MyApp);
