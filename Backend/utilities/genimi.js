import "dotenv/config";

const GoogleGenAIResponse = async (message) => {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.X_GOOGLE_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: message,
            },
          ],
        },
      ],
    }),
  };

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      options
    );

    const data = await response.json();

    console.log(data);

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    return text;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const GoogleGenAIMultimodalResponse = async (prompt, base64Data, mimeType) => {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.X_GOOGLE_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ],
        },
      ],
    }),
  };

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      options
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate audio summary.";
    return text;
  } catch (err) {
    console.error("Multimodal Gemini Error:", err);
    throw err;
  }
};

export default GoogleGenAIResponse;