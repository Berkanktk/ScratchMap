<script lang="ts">
  import { onMount } from "svelte";
  import Footer from "./Footer.svelte";
  import { writable } from "svelte/store";
  import LZString from "lz-string"; 

  // Map
  let jsVectorMap: any;
  let map: any;
  
  // Search
  let filteredCountries: string[] = [];
  let searchQuery = writable("");
  
  // Stats
  let visitedCountriesCount = writable(0);
  let totalCountriesCount = writable(0);
  let activeCountries = writable<string[]>([]);
 
  let showCopySuccess = false;
  
  let regionStatusesStore = writable<{ [code: string]: "visited" | "planned" | "banned" | null }>({});

  const modeColors: { [key: string]: string } = {
    visited: "#c78f57",
    planned: "#e5cab0", // #e9d4be & #e5cab0 alternative
    banned: "#2a2a2a",
    none: "#ffffff"
  };

  const listColors: ListColors = {
    visited: {
      text: "black", 
      background: "#c78f57"
    },
    planned: {
      text: "black",
      background: "#e5cab0"
    },
    banned: {
      text: "#777777",
      background: "#1c1c1c"
    },
    none: {
      text: "antiquewhite",
      background: "#2a2a2a"
    }
  };

  interface ListColors {
    visited: { text: string; background: string };
    planned: { text: string; background: string };
    banned: { text: string; background: string };
    none: { text: string; background: string };
  }

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
        const decompressed = LZString.decompressFromEncodedURIComponent(encodedModes);
        $regionStatusesStore = JSON.parse(decompressed || "{}");
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        $regionStatusesStore = {};
      }
    } else {
      $regionStatusesStore = JSON.parse(localStorage.getItem("regionStatuses") || "{}");
    }
  }

  function saveRegionStatuses() {
    localStorage.setItem("regionStatuses", JSON.stringify($regionStatusesStore));
  }

  function loadMap() {
    loadRegionStatuses();

    map = new jsVectorMap({
      selector: "#map",
      map: "world",
      enableZoom: true,
      showZoomButtons: true,
      showTooltip: true,
      regionsSelectable: false,
      regionStyle: {
        initial: {
          fill: function(code: string) {
            const mode = $regionStatusesStore[code] || "none";
            return modeColors[mode];
          }
        }
      },
      onRegionClick: (e: any, code: string) => {
        toggleRegionMode(code);
      },
      onRegionTooltipShow(e: any, tooltip: any, code: string) {
        tooltip.css({ backgroundColor: "#262626", color: "#c96" });
      }
    });

    Object.keys(map.regions).forEach((code) => {
      updateRegionStyle(code);
    });

    filteredCountries = getCountries();
    totalCountriesCount.set(getTotalCountriesCount());
    
    updateActiveCountries();
    updateVisitedCount();
  }

  function getCountryCode(country: string): string | undefined {
    if (!map || !map.regions) return undefined;

    return Object.keys(map.regions).find(
      (key) => map.regions[key].config.name === country
    );
  }

  function getModeForCountry(country: string): "visited" | "planned" | "banned" | "none" {
    const code = getCountryCode(country);
    if (!code) return "none";
    return $regionStatusesStore[code] ?? "none";
  }

  // Cycle the mode for a given country code
  function toggleRegionMode(code: string) {
    regionStatusesStore.update((statuses) => {
      const currentMode = statuses[code] || null;
      let newMode: "visited" | "planned" | "banned" | null;

      if (currentMode === null) newMode = "visited";
      else if (currentMode === "visited") newMode = "planned";
      else if (currentMode === "planned") newMode = "banned";
      else newMode = null;

      // if newmode is null, remove the country
      if (newMode === null) {
        delete statuses[code];
      } else {
        statuses[code] = newMode;
      }

      return statuses;
    });

    updateRegionStyle(code);
    updateActiveCountries();
    updateVisitedCount();
    saveRegionStatuses();
  }

  // Update the fill color for a given region based on its mode
  function updateRegionStyle(code: string) {
    if (!map || !map.regions[code]) return;
    const mode = $regionStatusesStore[code] || "none";
    map.regions[code].element.setStyle("fill", modeColors[mode]);
  }

  // Update the list of countries that have a mode set (non-null)
  function updateActiveCountries() {
    const active = Object.keys($regionStatusesStore)
      .filter((code) => $regionStatusesStore[code] !== null)
      .map((code) => map.regions[code].config.name)
      .sort();
    activeCountries.set(active);
  }

  function updateVisitedCount() {
    const visited = Object.values($regionStatusesStore).filter(
      (mode) => mode === "visited"
    ).length;
    visitedCountriesCount.set(visited);
  }

  function resetMap() {
    if (!map) return;
    Object.keys(map.regions).forEach((code) => {
      $regionStatusesStore[code] = null;
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

  // Toggle the mode for a given country name
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

  // Export data as CSV, JSON, or TXT
  function exportData(format: string) {
    if (!map) return;
    const dataArr = Object.keys($regionStatusesStore)
      .filter((code) => $regionStatusesStore[code] !== null)
      .map((code) => ({
        country: map.regions[code].config.name,
        mode: $regionStatusesStore[code]
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

  function shareMap() {
    const encodedModes = LZString.compressToEncodedURIComponent(JSON.stringify($regionStatusesStore));
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
    <h1>MyScratchMap</h1>
    <p>
      Click on a country to cycle through statuses.<br />
      <strong>Visited</strong> (orange), <strong>Planned</strong> (light orange), <strong>Banned</strong> (black)
    </p>

    <div class="stats">
      <h2>Visited Places</h2>
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
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      {#each filteredCountries as country}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="country" on:click={() => toggleCountry(country)}>
          <div
            class="countries"
            style="background-color: {listColors[getModeForCountry(country)].background}; color: {listColors[getModeForCountry(country)].text};"
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
    color: antiquewhite;
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
