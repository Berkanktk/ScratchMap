<script lang="ts">
  import { onMount } from "svelte";
  import Footer from "./Footer.svelte";
  import { writable } from "svelte/store";

  let jsVectorMap: any;
  let map: any;
  let filteredCountries: string[] = [];
  let searchQuery = writable("");

  let visitedCountriesCount = writable(0);
  let totalCountriesCount = writable(0);
  let selectedCountries = writable<string[]>([]);

  let showCopySuccess = false;

  onMount(async () => {
    const module = await import("jsvectormap");
    jsVectorMap = module.default;

    const script = document.createElement("script");
    script.src = "/world_merc_en.js";
    script.onload = () => loadMap();
    document.body.appendChild(script);
  });

  function loadMap() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedRegions = urlParams.get("countries");

    let sharedRegions = [];
    if (encodedRegions) {
      try {
        sharedRegions = JSON.parse(atob(encodedRegions));
      } catch (e) {
        sharedRegions = [];
      }
    } else {
      sharedRegions = JSON.parse(localStorage.getItem("selectedRegion") || "[]");
    }

    map = new jsVectorMap({
      selector: "#map",
      map: "world",
      enableZoom: true,
      showZoomButtons: true,
      showTooltip: true,
      regionsSelectable: true,
      selectedRegions: sharedRegions,
      onRegionTooltipShow(e: any, tooltip: any, code: any) {
        tooltip.css({ backgroundColor: "#262626", color: "#c96" });
      },
      regionStyle: {
        initial: { fill: "#ffffff" },
        selected: { fill: "#c96" },
      },
      onRegionSelected: updateSelectedCountries,
    });

    sharedRegions.forEach((code: any) => {
      if (map.regions[code]) {
        map.regions[code].element.select(true);
      }
    });

    filteredCountries = getCountries();
    updateSelectedCountries();

    // Update totalCountriesCount after the map is loaded
    totalCountriesCount.set(getTotalCountriesCount());
  }

  function showCopySuccessMessage() {
    showCopySuccess = true;
    setTimeout(() => (showCopySuccess = false), 2000);
  }

  function updateSelectedCountries() {
    if (!map) return;
    const selected = transformCountryCodes(map.getSelectedRegions());
    selectedCountries.set(selected);
    visitedCountriesCount.set(selected.length);
    localStorage.setItem(
      "selectedRegion",
      JSON.stringify(map.getSelectedRegions())
    );
  }

  function resetMap() {
    if (map) map.clearSelectedRegions();
    localStorage.removeItem("selectedRegion");
    selectedCountries.set([]);
    visitedCountriesCount.set(0);
  }

  function transformCountryCodes(regions: string[]) {
    return regions.map((region) => map.regions[region].config.name);
  }

  function getCountries() {
    return !map || !map.regions
      ? []
      : Object.keys(map.regions)
          .map((key) => map.regions[key].config.name)
          .sort();
  }

  function filterCountries(event: any) {
    searchQuery.set(event.target.value.trim().toLowerCase());
    filteredCountries = getCountries().filter((country) =>
      country.toLowerCase().includes(searchQuery)
    );
  }

  function toggleCountry(country: string) {
    if (!map) return;
    const code = Object.keys(map.regions).find(
      (key) => map.regions[key].config.name === country
    );
    if (code) selectCountry(code);
  }

  function selectCountry(code: string) {
    if (!map) return;
    map.getSelectedRegions().includes(code)
      ? map.regions[code].element.select(false)
      : map.regions[code].element.select(true);
    updateSelectedCountries();
  }

  function getTotalCountriesCount() {
    if (!map) return 0;
    return getCountries().length;
  }

  function exportData(format: string) {
    if (!map) return;
    const selectedRegions = map.getSelectedRegions();
    const countries = transformCountryCodes(selectedRegions);
    let data: any;
    let type;
    let extension;

    if (format === "csv" || format === "txt") {
      data = countries.join("\n");
      type = format === "csv" ? "text/csv" : "text/plain";
      extension = format;
    } else if (format === "json") {
      data = JSON.stringify(countries, null, 2);
      type = "application/json";
      extension = "json";
    }

    const blob = new Blob([data], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `countries.${extension}`;
    link.click();
  }

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
    const selectedRegions = map.getSelectedRegions();
    const encodedRegions = btoa(JSON.stringify(selectedRegions));
    const shareURL = `${window.location.origin}${window.location.pathname}?countries=${encodedRegions}`;

    navigator.clipboard.writeText(shareURL);
    
    showCopySuccessMessage();
  }
</script>

<div class="container">
  <div class="column">
    <div id="map" class="map-view"></div>
    <button class="button reset" on:click={resetMap}>Reset Map</button>
  </div>

  <div class="column">
    <h1>Visited Countries</h1>
    <p>
      Track and share your travel adventures! Click on countries to mark them as
      visited.
    </p>

    <div class="stats">
      <h2>All Countries</h2>
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
            class:selected={$selectedCountries.includes(country)}
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
    <button class="button" on:click={shareMap}>{showCopySuccess ? "Link Copied!" : "Share Link"}</button>
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
    margin: 20px 0 20px 0;
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
    transition: all 0.3s ease 0s;
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

  .selected {
    background-color: #c96;
  }

  .map-view {
    margin: 20px;
    width: 65vw;
    height: 85vh;
  }
</style>
