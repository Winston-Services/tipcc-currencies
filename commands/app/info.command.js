const path = require("path");
const csvFilePath = path.resolve(
  path.join(__dirname, "../../assets/currencies.csv")
);
const csv = require("csvtojson");
console.log("CSV :: ", csvFilePath);
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
    console.log(interaction, rest);

    const jsonArray = await csv().fromFile(csvFilePath);
    console.log(jsonArray);

    const isValidSymbol = stringValue => {
      return false;
    };

    const isValidName = stringValue => {
      return false;
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
        value: `${currency.CurrencySymbol}`
      },

      {
        name: "Explorer",
        value: `${currency.Explorer}`
      },
      {
        name: "Decimals",
        value: `${currency.Decimals}`
      }

      //: 'https://etherscan.io/token/0x954b890704693af242613edef1b603825afcd708',

      /*
      currency.PARTNER
      currency.Other
      */
    ];


    const currency = interaction.options.getString('currency');

    const tokenEmbed = this.buildEmbed({
      title: "{TOKEN_NAME} {TOKEN_SYMBOL}".replace("{TOKEN_NAME}", getTokenBySymbol(currency).CurrencyName).replace("{TOKEN_SYMBOL}", getTokenBySymbol(currency).CurrencySymbol),
      // description: "TOKEN DESCRIPTION",
      /**
       * Check for images/icons in data.
       */
      fields: currencyToFields(getTokenBySymbol(currency)),
      // footer: {}
    });
    return interaction.reply({ embeds: [tokenEmbed] });
  }
};
