exports.handler = async function(event, context) {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
  
    const { address } = event.queryStringParameters;
    
    if (!address) {
      return { statusCode: 400, body: 'Address parameter is required' };
    }
  
    try {
      // Call OpenStreetMap Nominatim (no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5`
      );
      
      const data = await response.json();
      
      // Return clean coordinates
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' // Important!
        },
        body: JSON.stringify(data)
      };
      
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Geocoding service unavailable' })
      };
    }
  };