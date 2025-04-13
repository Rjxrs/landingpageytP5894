// Example Netlify Function: netlify/functions/face-swap.js
// This code runs on Netlify's servers, NOT in the browser.
// You might need to install node-fetch: npm install node-fetch

// Use import syntax if your Netlify function environment supports ES Modules,
// otherwise use require: const fetch = require('node-fetch');
import fetch from 'node-fetch';

// The main handler function for the Netlify Function
exports.handler = async (event, context) => {
    // 1. Check if the request method is POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ error: 'Only POST requests are allowed' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // 2. Get the Segmind API Key from environment variables
    //    *** YOU MUST SET THIS IN YOUR NETLIFY SITE SETTINGS ***
    const SEGMIND_API_KEY = process.env.SEGMIND_API_KEY;
    const SEGMIND_API_URL = "https://api.segmind.com/v1/faceswap"; // Verify this endpoint

    if (!SEGMIND_API_KEY) {
        console.error("Segmind API Key environment variable not set.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: API key missing.' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        // 3. Parse the incoming request body (expecting JSON from frontend)
        const { source_image, target_image } = JSON.parse(event.body);

        if (!source_image || !target_image) {
            return {
                statusCode: 400, // Bad Request
                body: JSON.stringify({ error: 'Missing source_image or target_image in request body' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // 4. Prepare the payload for the actual Segmind API
        const segmindPayload = {
            source_image: source_image,
            target_image: target_image,
            // Add any other parameters Segmind requires
        };

        // 5. Call the Segmind API (using node-fetch or built-in fetch)
        console.log("Calling Segmind API..."); // Log for debugging on Netlify
        const segmindResponse = await fetch(SEGMIND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': SEGMIND_API_KEY, // Add the secret key here
            },
            body: JSON.stringify(segmindPayload),
        });

        console.log(`Segmind API Status: ${segmindResponse.status}`); // Log status

        // 6. Handle the Segmind API response
        if (!segmindResponse.ok) {
            let errorBody;
            try {
                 errorBody = await segmindResponse.text(); // Get error text
                 console.error("Segmind API Error Body:", errorBody); // Log error details
                 // Try parsing as JSON if possible for structured errors
                 try { errorBody = JSON.parse(errorBody); } catch(e) { /* ignore if not json */ }
            } catch(e) {
                errorBody = `Failed to read error response. Status: ${segmindResponse.status} ${segmindResponse.statusText}`;
            }
            // Return a structured error back to the frontend
            return {
                statusCode: segmindResponse.status, // Forward Segmind's status
                body: JSON.stringify({
                    error: `Segmind API Error (${segmindResponse.status})`,
                    details: errorBody
                 }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // 7. Process the successful Segmind response
        //    Check Segmind docs: Does it return JSON with base64 or the image blob directly?

        // --- Scenario A: Segmind returns JSON like { "image": "base64..." } ---
        const resultData = await segmindResponse.json();
        const resultBase64 = resultData?.image; // Adjust field name if needed

        if (!resultBase64) {
             throw new Error("Segmind API response did not contain expected image data.");
        }
         console.log("Received base64 image from Segmind.");

         // Return the base64 image data back to the frontend
         return {
             statusCode: 200,
             body: JSON.stringify({ image: resultBase64 }), // Send base64 back
             headers: { 'Content-Type': 'application/json' },
         };

        // --- Scenario B: Segmind returns the image blob directly ---
        // const imageBuffer = await segmindResponse.buffer(); // Get image data as a buffer
        // const resultBase64 = imageBuffer.toString('base64');
        // const contentType = segmindResponse.headers.get('content-type') || 'image/jpeg'; // Get content type
        // console.log(`Received ${contentType} image from Segmind.`);
        // // Return the base64 image data back to the frontend
        // return {
        //     statusCode: 200,
        //     body: JSON.stringify({ image: resultBase64, type: contentType }), // Send base64 & type back
        //     headers: { 'Content-Type': 'application/json' },
        // };


    } catch (error) {
        console.error('Error processing face swap request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Internal Server Error: ${error.message}` }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
