import {Component} from '@angular/core';
// @ts-ignore
import jsVectorMap from 'jsvectormap'
import 'jsvectormap/dist/maps/world.js'

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent {
  private map: any;
  showVisitedCountries = false;
  filteredCountries: string[] = [];
  selectedCountry: string = '';

  constructor() {
  }

  ngOnInit() {
    this.map = new jsVectorMap({
      selector: '#map',
      map: 'world',
      enableZoom: true,
      showZoomButtons: true,
      showTooltip: true,
      regionsSelectable: true,
      onRegionTooltipShow(event: any, tooltip:
        { css: (arg0: { backgroundColor: string; color: string; }) => void; }) {
        tooltip.css({backgroundColor: '#262626', color: '#c96'})
      },
      regionStyle: {
        initial: {
          fill: '#ffffff',
        },
        selected: {
          fill: '#c96',
        }
      },
      markerColor: '#c96',
    })
    this.filteredCountries = this.getMapCountries()
  }

  resetMap() {
    this.map.clearSelectedRegions()
  }

  saveImage() {
    const svg = document.querySelector('svg')
    const svgData = new XMLSerializer().serializeToString(svg!)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = document.createElement('img')
    canvas.width = svg!.clientWidth;
    canvas.height = svg!.clientHeight;
    img.setAttribute('src', 'data:image/svg+xml;base64,' + btoa(svgData))
    img.onload = () => {
      ctx!.drawImage(img, 0, 0)
      const canvasData = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.download = 'map.png'
      a.href = canvasData
      a.click()
    }
  }

  downloadCSV() {
    const selectedRegions = this.map.getSelectedRegions()
    const countries = this.transformCountryCodes(selectedRegions)
    const csv = countries.join('\n')
    const blob = new Blob([csv], {type: 'text/csv'})
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = 'countries.csv'
    link.click()
  }

  downloadJSON() {
    const selectedRegions = this.map.getSelectedRegions()
    const countries = this.transformCountryCodes(selectedRegions)
    const json = JSON.stringify(countries)
    const blob = new Blob([json], {type: 'application/json'})
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = 'countries.json'
    link.click()
  }

  downloadTXT() {
    const selectedRegions = this.map.getSelectedRegions()
    const countries = this.transformCountryCodes(selectedRegions)
    const txt = countries.join('\n')
    const blob = new Blob([txt], {type: 'text/plain'})
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = 'countries.txt'
    link.click()
  }

  transformCountryCodes(regions: string[]) {
    return regions.map((region) => this.map.regions[region].config.name)
  }

  getCountries() {
    return Object.keys(this.map.regions).map((key) => this.map.regions[key].config.name).sort()
  }

  toggleVisitedCountries() {
    this.showVisitedCountries = !this.showVisitedCountries;
  }

  getVisitedCountries() {
    const selectedRegions = this.map.getSelectedRegions()
    const countries = this.transformCountryCodes(selectedRegions)

    if (countries.length === 0) {
      return 'No countries selected.'
    }

    return countries.sort().join(', ')
  }

  toggleCountry(country: any) {
    console.log(country)
  }

  filterCountries($event: Event) {
    const search = ($event.target as HTMLInputElement).value.trim().toLowerCase();
    if (search) {
      const filteredCountries = this.getCountries().filter((country) =>
        country.toLowerCase().includes(search)
      );
      this.filteredCountries = filteredCountries;
      return filteredCountries;
    } else {
      this.filteredCountries = this.getCountries();
      return this.filteredCountries;
    }
  }

  toggleSelection(country: string) {
    if (this.selectedCountry === country) {
      this.selectedCountry = '';
    } else {
      this.selectedCountry = country;
    }
  }

}
