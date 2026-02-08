module.exports = {
    apps: [{
        name: 'cvenom-frontend',
        script: './start.sh',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            PORT: 4001
        }
    }]
};
