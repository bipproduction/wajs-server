async function query(data: any) {

  const file = Buffer.from(await Bun.file("./downloads/billing-server-20-06-2024.pdf").arrayBuffer()).toString("base64");
  const base64File = `data:application/pdf;base64,${file}`;

  const fileObject = {
    type: "file:full",
    data: base64File,
    mime: "application/pdf",
    name: "billing-server-20-06-2024.pdf"
  }
  const response = await fetch(
      "https://cloud-aiflow.wibudev.com/api/v1/prediction/4da85628-c638-43d3-9491-4cd0a7e6b1b8",
      {
          headers: {
              Authorization: "Bearer v3WdPjn61bNDsEYCO5_LYPRs16ICKjpQE6lF60DjpNo",
              "Content-Type": "application/json"
          },
          method: "POST",
          body: JSON.stringify({
            ...data,
            uploads: [fileObject]
          })
      }
  );
  const result = await response.text();
  return result;
}


query({"question": "apa isi data ini ?"}).then((response) => {
  console.log(response);
});
