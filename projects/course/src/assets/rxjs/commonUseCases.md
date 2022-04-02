# 1. Transformation <a id="transformation"></a>

## map <a id="map"></a>

The `map` operator is a Transformation Operator. It takes values from one Observable, transforms them, and creates a new Observable that emits the transformed values.

With map, you can perform simple transformations to the values emitted by an Observable.

Let's take a look at a common example in Angular: we get a backend response, and want to extract a property from it.

```Typescript
  import { map } from 'rxjs/operators';

  interface Response<T> {
    success: boolean;
    data: T;
  }

  (...)

  public getBooks(): Observable<Book[]> {
      return httpClient.get<Response<Book[]>>('/books').pipe(
        map((res: Response<Book[]>) => res.data) // only returns 'data'
    );
  }
```

## switchMap <a id="switchMap"></a>

`switchMap` receives the values emitted by an Observable, and then returns a new Observable from a different source.

A common example of `switchMap` is the following situation:

You have a list of books ids in a select dropdown. When the user selects a value, `selectedId$` emits a new value.
You need to get the complete book object based on this new `selectedId$` value.

```Typescript
  import { switchMap } from 'rxjs/operators';

  (...)
  selectedId$: Subject<string> = new Subject();
  selectedBook: Book;

  getBook(): void {
    this.selectedId$.pipe( // Listen to selectedId$ changes
      switchMap(id: string) => this.booksService.getBook(id)) // Redirects to another observable (http request)
    ).subscribe(book => this.selectedBook = book); // Get a book
  }
```

# 2. Filtering <a id="filtering"></a>

## filter <a id="filter"></a>

`filter` is an operator which emit values that pass the provided condition.
It is useful to filter values and subscribing only if it is needed.
For example, maybe you don't want to subscribe to a `selectedBook$` observable when its value is `null` or `undefined`.
You can use `filter` in this case:

```Typescript
  import { filter } from 'rxjs/operators';

  (...)

  selectedBook$: Observable<Book> = this.booksService.book$;

  getBook(): void {
    this.selectedBook$.pipe(
      filter(book => !!book) // returns false if book is null or undefined, and stops the observable here
    ).subscribe(book => this.book = book);
  }
```

## distinctUntilChanged <a id="distinctUntilChanged"></a>

Taking the previous example, you maybe don't want to pass twice in the `subscribe` when the value of `selectedBook$` does not change.

For this, you can use `distinctUntilChanged` operator:

```Typescript
  import { distinctUntilChanged } from 'rxjs/operators';

  (...)

  selectedBook$: Observable<Book> = this.booksService.book$;

  getBook(): void {
    this.selectedBook$.pipe(
      distinctUntilChanged() // stops if the previous and current values are the same
    ).subscribe(book => this.book = book);
  }
```

Note: distinctUntilChanged takes an optional callback as argument:

```Typescript
  getBook(): void {
    this.selectedBook$.pipe(
      distinctUntilChanged((previousValue: Book, currentValue: Book) => {
        return previousValue.id === currentValue.id; // will stops if ids are the same
      })
    ).subscribe(book => this.book = book);
  }
```

There is an operator for simple comparison like this, `distinctUntilKeyChanged`:

```Typescript
  import { distinctUntilKeyChanged } from 'rxjs/operators';

  (...)

  getBook(): void {
    this.selectedBook$.pipe(
      distinctUntilKeyChanged('id') // does the same as the previous example
    ).subscribe(book => this.book = book);
  }
```

## takeUntil <a id="takeUntil"></a>

Emit values until provided observable emits.

Example: manage unsubscriptions.

```Typescript
  import { takeUntil } from 'rxjs/operators';

  (...)

  this.dataService.data$.pipe(
    takeUntil(this.destroyed$) // will unsubscribe when destroyed$ completes
  ).subscribe(data => this.data = data);
```

# 3. Combination <a id="combination"></a>

## combineLatest <a id="combineLatest"></a>

When any observable emits a value, emits the last emitted value from each.

Be aware that combineLatest will not emit an initial value until each observable emits at least one value.

This operator is useful for example when we want to trigger a search based on reactive inputs values:

```Typescript
  import { combineLatest } from 'rxjs';

  (...)

  combineLatest([
      this.searchTextCtrl.valueChanges,
      this.dateRangeCtrl.valueChanges,
      this.author.valueChanges
    ]).subscribe(([
      searchText,
      dateRange,
      author
    ]) => this.results = this.getFilteredResults(searchText, dateRange, author));

```

## pairwise <a id="pairwise"></a>

`pairwise` operation allows to get the previous and current values from an observable as an array.

For example, we have a `selectedBook$` observable, which emit its new value everytime it changes.

We want to perform a comparison of the last value and the current one, we can do so:

```Typescript
  import { pairwise } from 'rxjs/operators';

  (...)

  this.selectedBook$.pipe( // For example, the previous value was 'Harry Potter 1' and the new one is '1984'
    pairwise()
  ).subscribe(([previousValue, currentValue]) => { // ['Harry Potter 1', '1984']
    // Do something here
  });

```

# 4. Utility <a id="utility"></a>

## tap <a id="tap"></a>

`tap` allows you to perform actions or side effects on an Observable stream without modifying or altering the original stream. The values "pass-through" the tap Operator to the next Operator or Subscriber.

```Typescript
  import { tap } from 'rxjs/operators';

  (...)

  public getBooks(): Observable<Book[]> {
    return httpClient.get<Book[]>('/books').pipe(
      tap((books) => this.snackbar.open(`${books.length} books received!`)) // action performed without altering the observable
    );
  }
```
