const form = document.getElementById("form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = form.querySelector('input[type="file"]').files[0];
  if (!file && file.files.length > 1) {
    document.body.innerHTML += "<p>No file selected or too many files</p>";
    window.location.reload();
    return;
  }

  const fileType = file.name.split(".").pop();
  if (fileType !== "zip") {
    window.location.reload();
    document.body.innerHTML += "<p>File type is not right</p>";
    return;
  }

  // 40MB
  if (file.size > 40 * 1024 * 1024) {
    console.error("File size exceeds 40MB");
    window.location.reload();
    return;
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  try {
    document.body.innerHTML += "<div>Loading...</div>";
    const response = await fetch("/api/screen", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Failed to upload file");
    }
    const imageUrl = await response.text();
    document.body.innerHTML += `<h2>Your website: </h2>`;
    document.body.innerHTML += `<img src="${imageUrl}" alt="Screenshot">`;
  } catch (error) {
    document.body.innerHTML += "<p>Error uploading file</p>";
  } finally {
    document.querySelector("div").remove();
  }
});
