import { Component } from '@angular/core';
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
  }

}
