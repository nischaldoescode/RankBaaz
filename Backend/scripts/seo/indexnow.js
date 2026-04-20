const key = "4eeccfa93b5449c58a8a6cd15e76d9fc";
const host = "vidhgrow.online";
const keyLocation = "https://vidhgrow.online/4eeccfa93b5449c58a8a6cd15e76d9fc.txt";

const urlList = [
  "https://vidhgrow.online/",
  "https://vidhgrow.online/about",
  "https://vidhgrow.online/contact",
  "https://vidhgrow.online/courses",
  "https://vidhgrow.online/privacy",
  "https://vidhgrow.online/terms",
  "https://vidhgrow.online/login",
  "https://vidhgrow.online/register",
  "https://vidhgrow.online/teacher"
];

async function submitToIndexNow() {
  const payload = {
    host,
    key,
    keyLocation,
    urlList
  };

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    console.log("Status Code:", response.status);
    console.log("Response Body:", text);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

submitToIndexNow();