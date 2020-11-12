import { Component, ElementRef, Input, AfterViewInit, OnInit, OnChanges  } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { SmoothieChart, TimeSeries } from 'smoothie';
import { MuseControlResponse, channelNames, EEGSample } from 'muse-js';
import { BandpassFilter } from './../shared/bandpass-filter';

import 'rxjs/add/observable/interval';
import 'rxjs/add/operator/take';

import { ChartService } from '../shared/chart.service';

const samplingFrequency = 256;

@Component({
  selector: 'brain-control',
  templateUrl: 'brain-control.component.html',
  styleUrls: ['brain-control.component.css'],
})
export class BrainControlComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {

  @Input() data: Observable<EEGSample>;

  filter = false;

  readonly channels = 4;
  readonly channelNames = channelNames.slice(0, this.channels);
  readonly amplitudes = [];
  readonly uVrms = [0, 0, 0, 0];
  readonly uMeans = [0, 0, 0, 0];

  readonly options = this.chartService.getChartSmoothieDefaults({
    millisPerPixel: 8,
    maxValue: 1000,
    minValue: -1000
  });
  readonly colors = this.chartService.getColors();
  readonly canvases = Array(this.channels).fill(0).map(() => new SmoothieChart(this.options));

  private readonly lines = Array(this.channels).fill(0).map(() => new TimeSeries());
  private readonly bandpassFilters: BandpassFilter[] = [];

  tp9Sensor: Observable<string>;
  af7Sensor: Observable<string>;
  af8Sensor: Observable<string>;
  tp10Sensor: Observable<string>;
  eegAvg: Observable<string>;

  constructor(private view: ElementRef, private chartService: ChartService) {
    this.chartService = chartService;

    for (let i = 0; i < this.channels; i++) {
      this.bandpassFilters[i] = new BandpassFilter(samplingFrequency, 1, 30);
    }
  }

  ngAfterViewInit() {
    const channels = this.view.nativeElement.querySelectorAll('canvas');
    this.canvases.forEach((canvas, index) => {
      canvas.streamTo(channels[index]);
    });
  }

  ngOnInit() {
    this.addTimeSeries();
    this.data.subscribe(sample => {
      sample.data.slice(0, this.channels).forEach((electrode, index) => {
        this.draw(electrode, index);
        this.tp9Sensor = this.amplitudes[0];
        this.af7Sensor = this.amplitudes[1];
        this.af8Sensor = this.amplitudes[2];
        this.tp10Sensor = this.amplitudes[3];
      });
    });
  }

  addTimeSeries() {
    this.lines.forEach((line, index) => {
      this.canvases[index].addTimeSeries(line, {
        lineWidth: 2,
        strokeStyle: this.colors[index].borderColor
      });
    });
  }

  draw(amplitude: number, index: number) {
    const filter = this.bandpassFilters[index];
    if (this.filter && !isNaN(amplitude)) {
      amplitude = filter.next(amplitude);
    }

    this.uMeans[index] = 0.995 * this.uMeans[index] + 0.005 * amplitude
    this.uVrms[index] = Math.sqrt(0.995 * this.uVrms[index]**2 + 0.005 * (amplitude - this.uMeans[index])**2)

    this.lines[index].append(new Date().getTime(), amplitude);
    this.amplitudes[index] = amplitude.toFixed(2);
  }

  decodeUnsigned12BitData(samples: Uint8Array) {
    const samples12Bit = [];
    // tslint:disable:no-bitwise
    for (let i = 0; i < samples.length; i++) {
        if (i % 3 === 0) {
            samples12Bit.push(samples[i] << 4 | samples[i + 1] >> 4);
        } else {
            samples12Bit.push((samples[i] & 0xf) << 8 | samples[i + 1]);
            i++;
        }
    }
    // tslint:enable:no-bitwise
    return samples12Bit;
  }

  // decodeEEGSamples(samples: Uint8Array) {
  //     return this.decodeUnsigned12BitData(samples)
  //         .map((n) => 0.48828125 * (n - 0x800));
  // }

  ngOnChanges() {
    if (this.data) {
      const cr = this.data;

      // this.tp9Sensor = cr.map(response => response.data[0]).filter(Boolean);

      // this.tp9Sensor = cr.map(response => response.data[0]).filter(Boolean);
      // this.af7Sensor = cr.map(response => response.data[1]).filter(Boolean);
      // this.af8Sensor = cr.map(response => response.data[2]).filter(Boolean);
      // this.tp10Sensor = cr.map(response => response.data[3]).filter(Boolean);

    }
  }

  ngOnDestroy() {
  }

}
