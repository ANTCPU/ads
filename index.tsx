import React from "react";
import Layout from "../components/Layout";

const HomePage = () => {
  return (
    <Layout>
      <h2 className="text-3xl font-bold mb-4">Welcome to AntCPU Ads</h2>
      <p className="text-gray-300 mb-6">
        Submit your campaign, track status, and see performance metrics in real time.
      </p>
      <button className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-6 py-3 rounded-full">
        Get Started - $9.99
      </button>
    </Layout>
  );
};

export default HomePage;
