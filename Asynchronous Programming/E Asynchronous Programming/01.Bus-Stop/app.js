async function getInfo() {
  const stopNameElement = document.getElementById("stopName");
  const timeTableElement = document.getElementById("buses");
  const submitBtn = document.getElementById("submit");

  const stopID = document.getElementById("stopId").value;
  const url = `http://localhost:3030/jsonstore/bus/businfo/${stopID}`;

  try {
    stopNameElement.textContent = "Loading...";
    timeTableElement.replaceChild();
    submitBtn.disabled = true;

    const res = await fetch(url);

    if (res.status !== 200) {
      throw Error("Stop ID is not found!");
    }

    const data = await res.json();

    Object.entries(data.buses)
  } catch {
    console.log("");
  }
}
