import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() { }

  saveObject(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  getObject(key: string) {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
}
