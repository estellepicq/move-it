import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { concatMap, exhaustMap, map, mergeMap, Observable, switchMap } from 'rxjs';

@Component({
  selector: 'app-sandbox',
  templateUrl: './sandbox.component.html',
  styleUrls: ['./sandbox.component.scss']
})
export class SandboxComponent implements OnInit {

  public ctrl: FormControl = new FormControl('');
  public output: string = '';

  constructor(
    private readonly http: HttpClient
  ) { }

  ngOnInit(): void {
  }

  private getData(search: string): Observable<any> {
    return this.http.get('https://jsonplaceholder.typicode.com/users', { params: {username: search}});
  }

}
