const fs = require("fs");
const path = require("path");
const csvFilePath = path.resolve(
  path.join(__dirname, "../../assets/currencies.csv")
);
const csv = require("csvtojson");
const axios = require("axios");

const fetch = axios.get;
// console.log("CSV :: ", csvFilePath);

function getABI() {}

function getStandardERCABI() {}

function getTokenTotalSupply(token, tokenAddress) {
  return "Total Supply Not Found.";
}

async function fetchCoinbrainData(
  coinbrainAPIURL,
  token,
  pairs,
  exchanges,
  pools,
  totalbaseTokenLiquidity,
  totalbaseTokenLiquidityUsd,
  totalTargetTokenLiquidity,
  totalTargetTokenLiquidityUsd,
  fields
) {
  const tokenDataFromCoinbrain = await fetch(coinbrainAPIURL);

  tokenDataFromCoinbrain.data.items.forEach(item => {
    const pair = `${item.target.symbol}::${token.CurrencySymbol.toLowerCase()}`;
    if (pairs.length === 0) {
      pairs.push(item.target.name);
    } else {
      if (pairs.findIndex(pair => pair === item.target.name) === -1) {
        pairs.push(item.target.name);
      }
    }

    if (exchanges.length === 0) {
      if (item.exchange.fullName !== null)
        exchanges.push({
          name: item.exchange.fullName,
          url: item.exchange.web,
          isVerified: item.exchange.isVerified
        });
    } else {
      if (
        exchanges.findIndex(
          exchange => exchange.name === item.exchange.fullName
        ) === -1
      ) {
        if (item.exchange.fullName !== null)
          exchanges.push({
            name: item.exchange.fullName,
            url: item.exchange.web,
            isVerified: item.exchange.isVerified
          });
      }
    }
    // item.verified;
    pools.push({
      target: {
        ...item.target
      },
      baseToke: {
        ...token
      },
      poolAddress: item.poolTokenAddress
    });
    totalbaseTokenLiquidity += item.baseTokenLiquidity;
    totalbaseTokenLiquidityUsd += item.baseTokenLiquidityUsd;
    if (totalTargetTokenLiquidity.length === 0) {
      totalTargetTokenLiquidity.push({
        pair: pair,
        total: item.targetTokenLiquidity
      });
    } else {
      if (
        totalTargetTokenLiquidity.findIndex(
          targetToken => targetToken.name === pair
        ) === -1
      ) {
        totalTargetTokenLiquidity.push({
          pair: pair,
          total: item.targetTokenLiquidity
        });
      } else {
        const coinHasIndex = totalTargetTokenLiquidity.findIndex(
          targetToken => targetToken.name === pair
        );
        if (coinHasIndex !== -1)
          totalTargetTokenLiquidity[coinHasIndex].total +=
            item.targetTokenLiquidity;
      }
    }

    //totalTargetTokenLiquidityUsd += item.targetTokenLiquidityUsd;
  });

  if(pairs.length)
  fields.push({
    name: `Pairs (${pairs.length})`,
    value: pairs.map(pair => `${pair}`).join(", ")
  });
  if(totalbaseTokenLiquidityUsd)
  fields.push({
    name: `Exchanges ($${totalbaseTokenLiquidityUsd.toFixed(
      2
    )}::${totalbaseTokenLiquidity})\nEst. Value : $${totalbaseTokenLiquidityUsd /
      totalbaseTokenLiquidity}`,
    value: exchanges
      .map(exchange => {
        return `${exchange.isVerified
          ? "✅"
          : ""}${exchange.name} | ${exchange.url}`;
      })
      .join("\n")
  });
}

function loadEmojiAssets() {
  const emojiAssetData = fs.readFileSync(
    path.resolve(path.join(__dirname, "../../assets/currency_emojis.json"))
  );
  return JSON.parse(emojiAssetData.toString(), false, 2);
}
module.exports = {
  type: undefined, // 1 | 2 | 3
  name: "info",
  description: "Display information about a currency on tipcc.",
  options: [
    {
      type: "StringOption",
      name: "currency",
      description: "Enter the currency name or abbreviation.",
      required: true
    }
  ],
  commands: undefined,
  dm_permission: false,
  default_permission: null,
  async execute() {
    const [interaction, ...rest] = arguments;
    // console.log(interaction, rest);
    const emojiAssets = loadEmojiAssets();
    const jsonArray = await csv().fromFile(csvFilePath);
    // console.log(jsonArray);

    const isValidSymbol = stringValue => {
      const currency = getTokenBySymbol(stringValue);
      return currency ? currency : false;
    };

    const isValidName = stringValue => {
      const currency = getTokenByName(stringValue);
      return currency ? currency : false;
    };

    const isValidContractAddress = stringValue => {};

    const isValidSymbolNameContractAddress = stringValue => {
      return (
        isValidSymbol(stringValue) ||
        isValidName(stringValue) ||
        isValidContractAddress(stringValue)
      );
    };

    const getTokenBySymbol = symbol => {
      return jsonArray.find(currency => {
        return currency.CurrencySymbol.toLowerCase() === symbol.toLowerCase();
      });
    };

    const getTokenByName = name => {
      return jsonArray.find(currency => {
        return currency.CurrencyName.toLowerCase() === name.toLowerCase();
      });
    };

    const splitUrlToObject = url => {
      // 'https://etherscan.io/token/0x954b890704693af242613edef1b603825afcd708'

      if (url.startsWith("https://")) {
        const parts = url.substring(8).split("/");
        return {
          parts,
          url
        };
      }
      return {
        url
      };
    };

    const currencyToFields = currency => [
      {
        name: "Currency",
        value: `${currency.CurrencyName}`,
        inline: true
      },
      {
        name: "Symbol",
        value: `${currency.CurrencySymbol}`,
        inline: true
      },
      {
        name: "Decimals",
        value: `${currency.Decimals}`,
        inline: true
      },
      {
        name: "Explorer",
        value: `${currency.Explorer}`,
        inline: false
      }

      //: 'https://etherscan.io/token/0x954b890704693af242613edef1b603825afcd708',

      /*
      currency.PARTNER
      currency.Other
      */
    ];

    const tokenEmoji = symbol =>
      emojiAssets.find(
        currency => currency.symbol.toLowerCase() === symbol.toLowerCase()
      );

    const supplyBurnText = "Total Supply : {TOTAL_SUPPLY}\nBurned Supply : {BURNED_SUPPLY}";


    const currency = interaction.options.getString("currency");
    if (isValidName(currency) || isValidSymbol(currency)) {
      if (isValidSymbol(currency)) {
        console.log("Currency By Symbol.");
        const token = getTokenBySymbol(currency);
        const extendedData = splitUrlToObject(token.Explorer);

        const fields = [...currencyToFields(token)];
        const pairs = [];
        const pools = [];
        // console.log(coinbrainAPIURL);

        const exchanges = [];
        let totalbaseTokenLiquidity = 0;
        let totalbaseTokenLiquidityUsd = 0;
        let totalTargetTokenLiquidity = [];
        let totalTargetTokenLiquidityUsd = 0;
        switch (extendedData.parts[0]) {
          case "etherscan.io":
            //its an evm token explorer link
            const ethereum = {
              name: "Ethereum Blockchain",
              value: `${supplyBurnText}`.replace("{TOTAL_SUPPLY}", 'Not Found').replace("{BURNED_SUPPLY}", 'Not Found')
            };
            fields.push(ethereum);
            token.totalSupply = getTokenTotalSupply(
              "eth",
              extendedData.parts[2]
            );
            const coinbrainETHAPIURL = `https://api.coinbrain.com/cointoaster/coins/liquidity-pools-page/?chainId=1&baseToken=${extendedData
              .parts[2]}&pagination=%7B%22limit%22%3A50%7D`;
            await fetchCoinbrainData(
              coinbrainETHAPIURL,
              token,
              pairs,
              exchanges,
              pools,
              totalbaseTokenLiquidity,
              totalbaseTokenLiquidityUsd,
              totalTargetTokenLiquidity,
              totalTargetTokenLiquidityUsd,
              fields
            );
            break;
          case "bscscan.com":
            const BSC_SVG =
              '<svg viewBox="0 0 24 24" width="24" height="24" class="css-1hoanxa"><circle cx="12" cy="12" r="12" fill="#F0B90B"></circle><path d="M7.754 6.45L12 4l4.246 2.45-1.561.906L12 5.811 9.315 7.356zm8.492 3.091l-1.561-.905L12 10.181 9.315 8.636l-1.56.905v1.811l2.684 1.546v3.09l1.561.906 1.561-.906v-3.09l2.685-1.546zm0 4.902v-1.81l-1.561.905v1.81zm1.108.64l-2.685 1.545v1.811l4.246-2.45v-4.902l-1.56.905zm-1.56-7.087l1.56.905v1.811l1.561-.905v-1.81l-1.56-.906zm-5.355 9.288v1.81L12 20l1.561-.905v-1.811L12 18.189zm-2.685-2.841l1.561.905v-1.81l-1.56-.906zm2.685-6.447L12 8.901l1.561-.905L12 7.091zm-3.793.905l1.56-.905-1.56-.905-1.561.905v1.81l1.56.906zm0 3.091l-1.561-.905v4.901L9.33 18.44v-1.81l-2.685-1.546z" fill="#fff"></path></svg>';

            const binance = {
              name: "Binance Smart Chain",
              value: `${supplyBurnText}`.replace("{TOTAL_SUPPLY}", 'Not Found').replace("{BURNED_SUPPLY}", 'Not Found')
            };
            fields.push(binance);

            token.totalSupply = getTokenTotalSupply(
              "bsc",
              extendedData.parts[2]
            );

            const coinbrainBSCAPIURL = `https://api.coinbrain.com/cointoaster/coins/liquidity-pools-page/?chainId=56&baseToken=${extendedData
              .parts[2]}&pagination=%7B%22limit%22%3A50%7D`;

            await fetchCoinbrainData(
              coinbrainBSCAPIURL,
              token,
              pairs,
              exchanges,
              pools,
              totalbaseTokenLiquidity,
              totalbaseTokenLiquidityUsd,
              totalTargetTokenLiquidity,
              totalTargetTokenLiquidityUsd,
              fields
            );
            break;
          case "snowtrace.io": //[avalanch, ]
            const avalanche = {
              name: "Avalanche Blockchain",
              value: "Total Supply : {TOTAL_SUPPLY}"
            };
            fields.push(avalanche);
            token.totalSupply = getTokenTotalSupply(
              "aval",
              extendedData.parts[2]
            );
            const coinbrainAvalancheAPIURL = `https://api.coinbrain.com/cointoaster/coins/liquidity-pools-page/?chainId=43114&baseToken=${extendedData
              .parts[2]}&pagination=%7B%22limit%22%3A50%7D`;
            await fetchCoinbrainData(
              coinbrainAvalancheAPIURL,
              token,
              pairs,
              exchanges,
              pools,
              totalbaseTokenLiquidity,
              totalbaseTokenLiquidityUsd,
              totalTargetTokenLiquidity,
              totalTargetTokenLiquidityUsd,
              fields
            );
            break;

          case "coinmarketcap.com":
            break;

          case "polygonscan.com":
            const polygon = {
              name: "Polygon(Matic) Blockchain",
              value: `${supplyBurnText}`.replace("{TOTAL_SUPPLY}", 'Not Found').replace("{BURNED_SUPPLY}", 'Not Found')
            };
            fields.push(polygon);
            token.totalSupply = getTokenTotalSupply(
              "matic",
              extendedData.parts[2]
            );
            //137
            const coinbrainPolygonAPIURL = `https://api.coinbrain.com/cointoaster/coins/liquidity-pools-page/?chainId=137&baseToken=${extendedData
              .parts[2]}&pagination=%7B%22limit%22%3A50%7D`;
            await fetchCoinbrainData(
              coinbrainPolygonAPIURL,
              token,
              pairs,
              exchanges,
              pools,
              totalbaseTokenLiquidity,
              totalbaseTokenLiquidityUsd,
              totalTargetTokenLiquidity,
              totalTargetTokenLiquidityUsd,
              fields
            );
            break;

          case "app-classic.terraswap.io":
            break;

          case "gnosisscan.io":
            const gnosis = {
              name: "Gnosis(xDai) Blockchain",
              value: `${supplyBurnText}`.replace("{TOTAL_SUPPLY}", 'Not Found').replace("{BURNED_SUPPLY}", 'Not Found')
            };
            fields.push(gnosis);
            token.totalSupply = getTokenTotalSupply(
              "matic",
              extendedData.parts[2]
            );

            break;

          case "wax.alcor.exchange":
            break;

          case "arbiscan.io":
            const arbitrum = {
              name: "Arbitrum Blockchain",
              value: `${supplyBurnText}`.replace("{TOTAL_SUPPLY}", 'Not Found').replace("{BURNED_SUPPLY}", 'Not Found')
            };
            fields.push(arbitrum);
            token.totalSupply = getTokenTotalSupply(
              "arbi",
              extendedData.parts[2]
            );
            const coinbrainArbitrumAPIURL = `https://api.coinbrain.com/cointoaster/coins/liquidity-pools-page/?chainId=42161&baseToken=${extendedData
              .parts[2]}&pagination=%7B%22limit%22%3A50%7D`;
            await fetchCoinbrainData(
              coinbrainArbitrumAPIURL,
              token,
              pairs,
              exchanges,
              pools,
              totalbaseTokenLiquidity,
              totalbaseTokenLiquidityUsd,
              totalTargetTokenLiquidity,
              totalTargetTokenLiquidityUsd,
              fields
            );
            break;
          case "optimistic.etherscan.io":
            const opti = {
              name: "Optimistic Blockchain",
              value: `${supplyBurnText}`.replace("{TOTAL_SUPPLY}", 'Not Found').replace("{BURNED_SUPPLY}", 'Not Found')
            };
            fields.push(opti);
            token.totalSupply = getTokenTotalSupply(
              "opti",
              extendedData.parts[2]
            );
            const coinbrainOptimisticAPIURL = `https://api.coinbrain.com/cointoaster/coins/liquidity-pools-page/?chainId=10&baseToken=${extendedData
              .parts[2]}&pagination=%7B%22limit%22%3A50%7D`;
            await fetchCoinbrainData(
              coinbrainOptimisticAPIURL,
              token,
              pairs,
              exchanges,
              pools,
              totalbaseTokenLiquidity,
              totalbaseTokenLiquidityUsd,
              totalTargetTokenLiquidity,
              totalTargetTokenLiquidityUsd,
              fields
            );
            break;
          case "lobstr.co":
            break;

          case "hive-engine.com":
            const hive = {
              name: "Hive Blockchain",
              value: "Total Supply : {TOTAL_SUPPLY}"
            };
            fields.push(hive);
            break;
        }
        console.log(fields);
        const tokenEmbed = this.buildEmbed({
          title: "{TOKEN_NAME} {TOKEN_SYMBOL}"
            .replace("{TOKEN_NAME}", token.CurrencyName)
            .replace("{TOKEN_SYMBOL}", token.CurrencySymbol),
          // description: "TOKEN DESCRIPTION",
          /**
         * Check for images/icons in data.
         */
          thumbnail:  tokenEmoji(token.CurrencySymbol).emoteUrl,
          image:"https://media.discordapp.net/stickers/994881786050007110.webp?size=160",
          fields,
          footer: { text:"Powered By: Winston Services\nhttps://discord.gg/ks3hfJacgY", icon_url : "https://media.discordapp.net/stickers/994881786050007110.webp?size=160"}
        });

        return interaction.reply({ embeds: [tokenEmbed] });
      } else {
        const tokenEmbed = this.buildEmbed({
          title: "{TOKEN_NAME} {TOKEN_SYMBOL}"
            .replace("{TOKEN_NAME}", getTokenByName(currency).CurrencyName)
            .replace("{TOKEN_SYMBOL}", getTokenByName(currency).CurrencySymbol),
          // description: "TOKEN DESCRIPTION",
          /**
         * Check for images/icons in data.
         */
          fields: currencyToFields(getTokenByName(currency))
          // footer: {}
        });

        return interaction.reply({ embeds: [tokenEmbed] });
      }
    } else {
      return interaction.reply("Invalid Currency or Currency not found.");
    }
  }
};
