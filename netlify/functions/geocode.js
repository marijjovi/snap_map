exports.handler = async function(event, context) {
  // Your existing serverless function code
  const { address } = event.queryStringParameters;
  
  try {
      const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5`
      );
      
      const data = await response.json();
      
      return {
          statusCode: 200,
          headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
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