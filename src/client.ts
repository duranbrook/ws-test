import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
    console.log('Connected to server');
    ws.send(JSON.stringify({
        msg: 'client send hello, server!',
        date: Date.now()
    }));
});

ws.on('message', (message: string) => {
    console.log({
        msg: `received data from server: ${message}`,
        time: Date.now()
    });
});

ws.on('close', () => {
    console.log({
        msg: 'close called',
        date: Date.now()
    });
    console.log('Disconnected from server');
});

