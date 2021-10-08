const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
require("@babel/register");

module.exports = {
  mode: "development",
  entry: ["webpack/hot/dev-server", "./src/index.ts"],
  output: {
    filename: "static/js/bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "index.html"),
    }),
  ],
  resolve: {
    extensions: [".ts", ".js", ".css"],
    modules: [path.resolve("./src"), path.resolve("./node_modules")],
  },
  devServer: {
    hot: true,
  },
  devtool: "source-map",
};
