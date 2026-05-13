const { createApp } = require("./app");
const { config } = require("./config/env");

const app = createApp();

app.listen(config.port, () => {
  console.log(`Jom Makcik CareRide backend listening on port ${config.port}`);
});
