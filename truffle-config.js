module.exports = {

  compilers: {
    solc: {
    version: "0.6.0",    // Fetch exact version from solc-bin (default: truffle's version)

  }
},

  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
  }
  }
};
