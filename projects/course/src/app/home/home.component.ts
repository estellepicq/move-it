import { Component, OnInit } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  
  public selectedTabIndex = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
  }

  ngOnInit(): void {
    this.selectedTabIndex = this.route.snapshot.queryParams.tabIndex || 0;
  }

  public onTabSelected(event: MatTabChangeEvent): void {
    const index = event.index;
    this.router.navigate([], {
      queryParams: { tabIndex: index },
      queryParamsHandling: 'merge'
    });
    this.selectedTabIndex = index;
  }
}
