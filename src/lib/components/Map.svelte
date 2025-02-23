<script lang="ts">
  import { onMount } from "svelte";
  import Footer from "./Footer.svelte";
  import { writable } from "svelte/store";
  import LZString from "lz-string"; // Import LZ‑String

  let jsVectorMap: any;
  let map: any;
  let filteredCountries: string[] = [];
  let searchQuery = writable("");

  let visitedCountriesCount = writable(0);
  let totalCountriesCount = writable(0);
  // this store now holds the display names for countries with a non-null mode
  let activeCountries = writable<string[]>([]);

  let showCopySuccess = false;

  // Object to hold the mode for each country (keyed by country code)
  // mode can be "visited", "planned", "banned" or null (for none)
  let regionStatuses: { [code: string]: "visited" | "planned" | "banned" | null } = {};

  // Color mapping for each mode
  const modeColors: { [key: string]: string } = {
    visited: "#92cc66",
    planned: "#c96",
    banned: "#2a2a2a",
    none: "#ffffff"
  };

  const listColors: { [key: string]: string } = {
    visited: "#92cc66",
    planned: "#c96",
    banned: "#1c1c1c",
    none: "#2a2a2a"
  };

  onMount(async () => {
    const module = await import("jsvectormap");
    jsVectorMap = module.default;

    const script = document.createElement("script");
    script.src = "/world_merc_en.js";
    script.onload = () => loadMap();
    document.body.appendChild(script);
  });

  // Load regionStatuses from URL parameter (if exists) or localStorage
  function loadRegionStatuses() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedModes = urlParams.get("modes");
    if (encodedModes) {
      try {
        // Use LZString to decompress the data
        const decompressed = LZString.decompressFromEncodedURIComponent(encodedModes);
        regionStatuses = JSON.parse(decompressed || "{}");
      } catch (e) {
        regionStatuses = {};
      }
    } else {
      regionStatuses = JSON.parse(localStorage.getItem("regionStatuses") || "{}");
    }
  }

  function saveRegionStatuses() {
    localStorage.setItem("regionStatuses", JSON.stringify(regionStatuses));
  }

  function loadMap() {
    // load statuses first
    loadRegionStatuses();

    map = new jsVectorMap({
      selector: "#map",
      map: "world",
      enableZoom: true,
      showZoomButtons: true,
      showTooltip: true,
      // Disable built-in region selection so we can manage our own modes
      regionsSelectable: false,
      // Set initial style per region using our regionStatuses
      regionStyle: {
        initial: {
          fill: function(code: string) {
            const mode = regionStatuses[code] || "none";
            return modeColors[mode];
          }
        }
      },
      // Use onRegionClick to toggle through modes
      onRegionClick: (e: any, code: string) => {
        toggleRegionMode(code);
      },
      // Optional: style tooltip if needed
      onRegionTooltipShow(e: any, tooltip: any, code: string) {
        tooltip.css({ backgroundColor: "#262626", color: "#c96" });
      }
    });

    // Update all regions with the proper color based on mode.
    Object.keys(map.regions).forEach((code) => {
      updateRegionStyle(code);
    });

    filteredCountries = getCountries();
    updateActiveCountries();

    // Update totalCountriesCount after the map is loaded
    totalCountriesCount.set(getTotalCountriesCount());
  }

  function getCountryCode(country: string): string | undefined {
    // In case the map isn't loaded yet or doesn't have `regions`
    if (!map || !map.regions) return undefined;

    return Object.keys(map.regions).find(
      (key) => map.regions[key].config.name === country
    );
  }

  // Convenience function that returns the mode (or "none") for a given country name
  function getModeForCountry(country: string): "visited" | "planned" | "banned" | "none" {
    const code = getCountryCode(country);
    if (!code) return "none";
    return regionStatuses[code] ?? "none";
  }

  // Cycle the mode for a given country code
  function toggleRegionMode(code: string) {
    const currentMode = regionStatuses[code] || null;
    let newMode: "visited" | "planned" | "banned" | null;
    if (currentMode === null) {
      newMode = "visited";
    } else if (currentMode === "visited") {
      newMode = "planned";
    } else if (currentMode === "planned") {
      newMode = "banned";
    } else {
      newMode = null;
    }
    regionStatuses[code] = newMode;
    updateRegionStyle(code);
    updateActiveCountries();
    updateVisitedCount();
    saveRegionStatuses();
  }

  // Update the fill color for a given region based on its mode
  function updateRegionStyle(code: string) {
    if (!map || !map.regions[code]) return;
    const mode = regionStatuses[code] || "none";
    // Change the fill color directly on the region element
    map.regions[code].element.setStyle("fill", modeColors[mode]);
  }

  // Update the list of countries that have a mode set (non-null)
  function updateActiveCountries() {
    const active = Object.keys(regionStatuses)
      .filter((code) => regionStatuses[code] !== null)
      .map((code) => map.regions[code].config.name)
      .sort();
    activeCountries.set(active);
  }

  // Count visited countries only (or you could count per mode if needed)
  function updateVisitedCount() {
    const visited = Object.values(regionStatuses).filter(
      (mode) => mode === "visited"
    ).length;
    visitedCountriesCount.set(visited);
  }

  function resetMap() {
    if (!map) return;
    // Reset all region modes and set fill to default white
    Object.keys(map.regions).forEach((code) => {
      regionStatuses[code] = null;
      updateRegionStyle(code);
    });
    localStorage.removeItem("regionStatuses");
    activeCountries.set([]);
    visitedCountriesCount.set(0);
  }

  function getCountries() {
    return !map || !map.regions
      ? []
      : Object.keys(map.regions)
          .map((key) => map.regions[key].config.name)
          .sort();
  }

  function filterCountries(event: any) {
    const query = event.target.value.trim().toLowerCase();
    searchQuery.set(query);
    filteredCountries = getCountries().filter((country) =>
      country.toLowerCase().includes(query)
    );
  }

  // When a country name is clicked from the list, find its code and toggle mode
  function toggleCountry(country: string) {
    if (!map) return;
    const code = Object.keys(map.regions).find(
      (key) => map.regions[key].config.name === country
    );
    if (code) toggleRegionMode(code);
  }

  function getTotalCountriesCount() {
    if (!map) return 0;
    return getCountries().length;
  }

  // Export data now includes region statuses for each country.
  function exportData(format: string) {
    if (!map) return;
    // Create an array of objects with country name and mode
    const dataArr = Object.keys(regionStatuses)
      .filter((code) => regionStatuses[code] !== null)
      .map((code) => ({
        country: map.regions[code].config.name,
        mode: regionStatuses[code]
      }));
    let data: any;
    let type;
    let extension;

    if (format === "csv" || format === "txt") {
      // For CSV/TXT, each line is "country,mode"
      data = dataArr.map((entry) => `${entry.country},${entry.mode}`).join("\n");
      type = format === "csv" ? "text/csv" : "text/plain";
      extension = format;
    } else if (format === "json") {
      data = JSON.stringify(dataArr, null, 2);
      type = "application/json";
      extension = "json";
    }

    const blob = new Blob([data], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `countries.${extension}`;
    link.click();
  }

  // Save the map as a PNG image
  function saveImage() {
    const svg = document.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = document.createElement("img");
    canvas.width = svg.clientWidth;
    canvas.height = svg.clientHeight;
    img.setAttribute("src", "data:image/svg+xml;base64," + btoa(svgData));
    img.onload = () => {
      ctx!.drawImage(img, 0, 0);
      const canvasData = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.download = "map.png";
      a.href = canvasData;
      a.click();
    };
  }

  // When sharing the map, encode the regionStatuses in the URL using LZ‑String for a shorter string
  function shareMap() {
    // Compress and encode the regionStatuses object
    const encodedModes = LZString.compressToEncodedURIComponent(JSON.stringify(regionStatuses));
    console.log(JSON.stringify(regionStatuses));
    const shareURL = `${window.location.origin}${window.location.pathname}?modes=${encodedModes}`;
    navigator.clipboard.writeText(shareURL);
    showCopySuccessMessage();
  }

  function showCopySuccessMessage() {
    showCopySuccess = true;
    setTimeout(() => (showCopySuccess = false), 2000);
  }
</script>

<div class="container">
  <div class="column">
    <div id="map" class="map-view"></div>
    <button class="button reset" on:click={resetMap}>Reset Map</button>
  </div>

  <div class="column">
    <h1>Country Status</h1>
    <p>
      Click on a country to cycle through statuses: <br />
      <span style="color:#92cc66">Visited</span>,
      <span style="color:#c96">Planned</span> and
      <span style="color:#c73636">Banned</span>.
    </p>

    <div class="stats">
      <h2>Visited Countries</h2>
      <h2>{$visitedCountriesCount} out of {$totalCountriesCount}</h2>
    </div>

    <input
      type="text"
      class="search"
      placeholder="Search..."
      on:input={filterCountries}
      bind:value={$searchQuery}
    />

    <div class="list">
      {#each filteredCountries as country}
        <div class="country" on:click={() => toggleCountry(country)}>
          <div
            class="countries"
            style="background-color: {listColors[getModeForCountry(country)]}"
          >
            {country}
          </div>
        </div>
      {/each}
    </div>
    
    <h2>Export Data</h2>
    <button class="button" on:click={saveImage}>Save as PNG</button>
    <button class="button" on:click={() => exportData("csv")}>Save as CSV</button>
    <button class="button" on:click={() => exportData("json")}>Save as JSON</button>
    <button class="button" on:click={() => exportData("txt")}>Save as TXT</button>
    <button class="button" on:click={shareMap}>
      {showCopySuccess ? "Link Copied!" : "Share Link"}
    </button>
  </div>
</div>

<Footer />

<style>
  h1 {
    font-family: "Open Sans", sans-serif;
    font-size: 30px;
    color: #c96;
    line-height: 1.5em;
    margin: 0 0 20px 0;
  }

  h2 {
    font-family: "Open Sans", sans-serif;
    color: #c96;
    line-height: 1.5em;
    margin: 20px 0;
  }

  p {
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.66);
    line-height: 1.5em;
    margin: 0 0 20px 0;
  }

  .container {
    display: flex;
  }

  .column {
    flex: 1;
    height: calc(100vh - 50px);
  }

  .column:last-child {
    flex-basis: 30%;
    padding: 20px;
    overflow: auto;
  }

  .reset {
    display: flex;
    justify-self: center;
  }

  .button {
    background-color: #2a2a2a;
    color: white;
    font-size: 14px;
    padding: 10px 24px;
    border: none;
    cursor: pointer;
    border-radius: 5px;
    text-align: center;
    transition: all 0.3s ease;
    margin: 5px;
  }

  .button:hover {
    background-color: #c96;
    color: white;
    box-shadow: 0 0 20px #c96;
  }

  .list {
    height: calc(100vh - 500px);
    overflow: auto;
  }

  .country {
    width: 95%;
    cursor: pointer;
  }

  .countries {
    color: white;
    display: grid;
    padding: 8px;
    background-color: #2a2a2a;
    margin-bottom: 5px;
    border-radius: 10px;
  }

  .stats {
    display: flex;
    justify-content: space-between;
  }

  .search {
    background-color: #2a2a2a;
    border-radius: 10px;
    border-color: #c96;
    padding: 10px;
    margin-bottom: 15px;
    width: 50%;
    color: white;
  }

  .search:focus {
    outline: none;
  }

  ::-webkit-scrollbar {
    width: 10px;
  }

  ::-webkit-scrollbar-track {
    background: #2a2a2a;
    border-radius: 5px;
  }

  ::-webkit-scrollbar-thumb {
    background: #c96;
    border-radius: 5px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #efb277;
  }

  .map-view {
    margin: 20px;
    width: 65vw;
    height: 85vh;
  }
</style>
