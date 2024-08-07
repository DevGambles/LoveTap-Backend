const Ably = require('ably');
// Initialize Ably with your API key
const ably = new Ably.Realtime({
  key:'Y0JswA.a8WNqg:NylcmIvzGaGj1ptBdMjnQ7pFRgicUHnKIoViuZHObxo',
  transportParams:{heartbeatInterval:5000}
});
ably.connection.once("connected", () => {
  console.log("Connected to Ably!")
})
ably.connection.on('suspended', () => {
  console.warn('Connection suspended, attempting to reconnect...');
  ably.connect(); // Attempt to reconnect
});

ably.connection.on('connected', () => {
  console.log('Reconnected to Ably!');
});
// Create a channel
const channel = ably.channels.get('broadcast-channel');

channel.attach();

channel.subscribe((message) => {
  console.log(message.data);
});

// Function to broadcast a message to all connected clients
function broadcastMessage(message) {
  channel.publish('broadcast-event', { message }, (err) => {
    if (err) {
      console.error('Error broadcasting message:', err);
    } else {
      console.log('Message broadcasted successfully');
    }
  });
}

module.exports = {  ably, channel, broadcastMessage  };