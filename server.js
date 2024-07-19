const express = require('express');
const { SparqlEndpointFetcher } = require('fetch-sparql-endpoint');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const fetcher = new SparqlEndpointFetcher();

app.post('/query', async (req, res) => {
  const { query } = req.body;
  const queryString = `
  PREFIX : <http://mcsk.enit.fr/chaikmat#>
  SELECT *
  WHERE {
    GRAPH <http://mcsk.enit.fr/chaikmat> {
      ${query}
    }
  }
`;
  const graphDBEndpoint = process.env.GRAPHDB_ENDPOINT;

  if (!graphDBEndpoint) {
    return res.status(500).json({ error: 'GraphDB endpoint is not defined' });
  }

  try {
    const bindingsStream = await fetcher.fetchBindings(graphDBEndpoint, queryString);

    const results = [];
    bindingsStream.on('data', bindings => {
      const transformedBindings = {};
      for (const [key, value] of Object.entries(bindings)) {
        transformedBindings[key] = value.value;
      }
      results.push(transformedBindings);
    });

    bindingsStream.on('end', () => {
      res.json(results);
    });

    bindingsStream.on('error', (error) => {
      console.error('Error in bindings stream:', error);
      res.status(500).json({ error: error.message });
    });

  } catch (error) {
    console.error('Error sending query:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
