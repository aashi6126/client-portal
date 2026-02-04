const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;

app.get('/fetch-data', async (req, res) => {
    try {
        const response = await axios.get('https://api.example.com/data');
        const data = response.data;
        // Extract information from the response
        const extractedInfo = {
            // ...extract necessary information from data...
        };
        res.json(extractedInfo);
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
