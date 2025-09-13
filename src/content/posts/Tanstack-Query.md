---
title: Tanstack Query 내부 구조 분석
date: '2024-09-14'
description: QueryClient부터 Observer까지 Tanstack Query의 구조 파악하기
thumbnail: '/images/tanstack_query_logo.png'
tags: ['TanstackQuery', 'OpenSource']
---

## Tanstack Query란

`Tanstack Query`는 어느 순간 부터 프론트엔드 개발의 핵심 기술 스택 중 하나로 자리 잡았습니다.
아마 다음과 같은 대표적인 두 가지 이유가 현재의 인기를 주도했을 것이라 생각합니다.

1. 코드 관리가 까다로워질수 있는 서버 데이터의 관리를 효율적으로 도와준다.
2. `SWR(stale-while-revalidate)`를 기반으로 하는 캐싱을 지원해준다.

만약 Tanstack Query를 사용하지 않았다면 우리는 다음과 같이 코드를 작성하였을 것이죠.


```js
export function TodoListBasic() {
  const [todos, setTodos] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch('/api/todos')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      
      .then(data => {
        if (!cancelled) {
          setTodos(data);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) return <p>로딩 중…</p>;
  if (error) return <p>에러 발생: {error.message}</p>;
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}
```

위 코드만 보더라도 우리는 데이터 요청을 하나를 처리하기 위해 꽤나 많은 상태를 관리해야 하는 것을 확인할 수 있습니다. 특히 isLoading, error, todos와 같은 상태들이 어느 시점에 갱신되어야하는지를 고려해야하죠.

이처럼 로딩과 에러 상태를 직접 관리하는 보일러플레이트가 늘어나면, 실제로 집중해야 할 비즈니스 로직이 가려지기 쉽습니다.

여기에 더해 캐시 기능까지 추가하면 어떨까요 ?

```js
export function TodoListWithCache() {
  const [todos, setTodos] = useState(() => cache.get('/api/todos'));
  const [isLoading, setLoading] = useState(() => !cache.has('/api/todos'));
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // 1) 캐시에 데이터가 있으면 즉시 표시
    if (cache.has('/api/todos')) {
      setTodos(cache.get('/api/todos'));
      setError(null);
    } else {
      setLoading(true);
    }

    // 2) 중복 요청 방지 & fetch
    const fetchPromise =
      inFlight.get('/api/todos') ||
      fetch('/api/todos').then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
    inFlight.set('/api/todos', fetchPromise);

    fetchPromise
      .then(data => {
        if (!cancelled) {
          cache.set('/api/todos', data);
          setTodos(data);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          inFlight.delete('/api/todos');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) return <p>로딩 중…</p>;
  if (error) return (
    <div>
      <p>에러 발생: {error.message}</p>
      <button onClick={() => window.location.reload()}>다시 시도</button>
    </div>
  );

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}
```

정작 집중해야 할 핵심적인 비즈니스 로직과는 관련 없는 부가적인 상태 관리와 캐시·중복 요청 로직이 얽히면서 코드는 금세 복잡해지고는 합니다. 바로 이러한 포인트를 `Tanstack Query`가 깔끔하게 정리해주는 것이죠.

## useQuery 내부 들여다보기

앞서 언급한 `로딩 및 에러의 상태 관리`, `캐싱`은 분명 Tanstack Query의 가장 눈에 띄는 두 축입니다. 하지만 Tanstack Query의 매력은 이 두축을 잘 활용할 수 있게 만드는 구조적 설계에 있습니다.

우리가 컴포넌트 내부에서 흔히 사용하는 `useQuery`의 내부를 먼저 살펴보면 `useBaseQuery`를 래핑한 함수라는 것을 확인할 수 있습니다. ([코드 보기](https://github.com/TanStack/query/blob/main/packages/react-query/src/useQuery.ts))

```js
export function useQuery(options: UseQueryOptions, queryClient?: QueryClient) {
  return useBaseQuery(options, QueryObserver, queryClient)
}
```

`useBaseQuery`([코드 보기](https://github.com/TanStack/query/blob/main/packages/react-query/src/useBaseQuery.ts))에서는 `Observer`를 새로 생성하는데요,

```js 
 const [observer] = React.useState(
    () =>
      new Observer<TQueryFnData, TError, TData, TQueryData, TQueryKey>(
        client,
        defaultedOptions,
      ),
  )
```

컴포넌트는 `Observer`라는 별도의 관리자를 붙여두어, 알맞은 타이밍에 React에게 리렌더링을 요청하는 구조가 됩니다.
또한 `useState`의 initializer에서 옵저버를 생성했기에 컴포넌트가 마운트 될때 한번만 호출되었기에 생명주기 동안 동일한 옵저버를 사용하는 것이 가능합니다.

### Observer와 Subscription

앞서 살펴본 `Observer`는 단순히 상태를 저장하는 객체가 아닙니다. 실제로는 외부 스토어와 React 컴포넌트를 연결하는 다리 역할을 하는데요, 이 연결 과정은 아래 코드를 통해 확인할 수 있습니다. 

```js
 React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) => {
        const unsubscribe = shouldSubscribe
          ? observer.subscribe(notifyManager.batchCalls(onStoreChange))
          : noop

        observer.updateResult()

        return unsubscribe
      },
      [observer, shouldSubscribe],
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult(),
  )
```


먼저 `useSyncExternalStore`는 `외부 스토어와 리액트의 렌더 주기를 연동`시키는 훅으로, 첫번째 파라미터에는 스토어가 변경될 때 호출되는 `onStoreChange`콜백을 옵저버 구독 리스트에 추가합니다.

QueryObserver([코드 보기](https://github.com/TanStack/query/blob/main/packages/query-core/src/queryObserver.ts))의 코드를 확인해보면  

```js
extends Subscribable<QueryObserverListener<TData, TError>>
```

`Subscribable` 클래스를 확장해서 사용하고 있다는것을 알 수 있는데요, 

```js
subscribe(listener: TListener): () => void {
    this.listeners.add(listener)

    this.onSubscribe()

    return () => {
      this.listeners.delete(listener)
      this.onUnsubscribe()
    }
  }

```

해당 클래스에서 앞서 호출한 `subscribe`의 구현체가 존재하고 파라미터에 전달한 콜백 함수 `onStoreChange`를 리스너에 추가하는 것을 확인할 수 있습니다. 

### 배치 (Batch)

구독할 때의 코드를 살펴보면, 단순히 `subscribe` 함수에 `callback` 함수를 바로 전달하는 것이 아닌 `notifyManager`의 `batchCalls` 함수로 한번 래핑한 후 전달합니다.

```js
observer.subscribe(notifyManager.batchCalls(onStoreChange))
```

쿼리 상태가 짧은 시간내에 여러번 변경되는 경우 `onStoreChange`는 그 때마다 실행됩니다. 이 경우 컴포넌트가 여러번 리렌더링 될 수 있기에 `notifyManager`([코드 보기](https://github.com/TanStack/query/blob/main/packages/query-core/src/notifyManager.ts))는 모든 호출을 스케줄 큐에 넣은 뒤 한번에 flush하기 해줍니다.

즉, 내부 상태 변화는 여러번이지만 React 컴포넌트의 입장에서는 최종적으로 한번만 렌더링할 수 있게 되는 것이죠.

## Observer와 Query의 연결

여기까지는 Observer와 React 컴포넌트 사이의 연결에 대해 살펴봤지만, 아직 Observer가 구독하는 스토어에 관해서는 명확히 짚지 않았습니다.

이를 확인하기 위해 `useBaseQuery`에서 Observer가 생성될 때의 로직을 살펴보겠습니다. ([코드 보기](https://github.com/TanStack/query/blob/main/packages/query-core/src/queryObserver.ts))

```js
#updateQuery(): void {
    const query = this.#client.getQueryCache().build(this.#client, this.options)

    if (query === this.#currentQuery) {
      return
    }

    const prevQuery = this.#currentQuery as
      | Query<TQueryFnData, TError, TQueryData, TQueryKey>
      | undefined
    this.#currentQuery = query
    this.#currentQueryInitialState = query.state

    if (this.hasListeners()) {
      prevQuery?.removeObserver(this)
      query.addObserver(this)
    }
  }
```

위 로직을 보면, Observer는 QueryClient 내부의 QueryCache에서 조건에 맞는 Query를 확보하여 자신을 Observer로 등록합니다.

즉, Observer가 바라보는 외부 스토어는 QueryCache도, QueryClient도 아닌 <b>현재 옵저버가 연결된 단일 Query </b>의 상태인 것이죠.


### QueryCache의 build 과정

앞서 `updateQuery()`에서 확인할 수 있듯이 옵저버는 Query를 직접 만들지 않고 항상 QueryCache를 통해 확보합니다.

```js
this.#client.getQueryCache().build(...)
```

QueryCache의 `build`를 살펴보면 ([코드 보기](https://github.com/TanStack/query/blob/main/packages/query-core/src/queryCache.ts))

```js
 build<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    client: QueryClient,
    options: WithRequired<
      QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
      'queryKey'
    >,
    state?: QueryState<TData, TError>,
  ): Query<TQueryFnData, TError, TData, TQueryKey> {
    const queryKey = options.queryKey
    const queryHash =
      options.queryHash ?? hashQueryKeyByOptions(queryKey, options)
    let query = this.get<TQueryFnData, TError, TData, TQueryKey>(queryHash)

    if (!query) {
      query = new Query({
        client,
        queryKey,
        queryHash,
        options: client.defaultQueryOptions(options),
        state,
        defaultOptions: client.getQueryDefaults(queryKey),
      })
      this.add(query)
    }

    return query
  }
```

queryKey와 옵션을 직렬화해 고유한 해시를 만들고 이를 캐시 맵에서 조회해옵니다. 이로 인해 같은 쿼리 키 + 옵션일 경우 동일한 쿼리를 재사용이 가능한 것이죠.


## Tanstack Query 구조

여기까지의 흐름을 정리해보면 `useQuery → useBaseQuery → Observer → QueryCache.build`로 이어지는 파이프라인을 따라 컴포넌트가 쿼리의 상태를 구독하고 리렌더링하는 과정이였습니다. 

이제는 지금까지 알아본 개별 코드 레벨을 기반으로 Tanstack Query의 전체 구조를 조금 더 큰 그림에서 정리해보겠습니다.

### Tanstack Query의 핵심 구성 요소

![Image](https://lh3.googleusercontent.com/d/1n6efZQgHknfO77mqziF0-l9L7jXlxcNJ)

Tanstack Query는 크게 다음과 같은 핵심 요소들로 이루어져 있습니다.

1. `QueryClient`: 애플리케이션의 쿼리 상태를 관리하는 전역 관리자입니다. 모든 쿼리 동작의 진입점 역할을 하며 `QueryCache`와 `MutationCache`를 가지고 있습니다. Devtool 연동이나 캐시 관련 정책 설정도 이 곳에서 제어됩니다.

2. `QueryCache`: Map<queryKeyHash, Query> 형태로 모든 쿼리 인스턴스를 관리하며 쿼리 키를 해시한 값을 기준으로 Query 인스턴스를 저장하고 재사용합니다. 즉, 동일한 queryKey와 옵션으로 요청이 들어올 때. 항상 같은 `Query` 인스턴스를 반환할 수 있게되며 이로 인해 여러 컴포넌트가 동일한 데이터를 바라볼 수 있습니다.

3. `Query`: 하나의 쿼리 요청 단위를 캡슐화한 클래스로 내부적으로 상태머신을 통해 idle,loading, success/error 전이를 관리합니다. 여기서 중요한 점은 `Query`는 단순히 fetch 실행만을 담당하는 것이 아닌, 결과를 캐시에 저장하며 Observer들에게 상태 변화를 알리는 주체입니다.

4. `Observer`: 특정 `Query` 인스턴스와 컴포넌트를 연결하여 `Query` 상태를 관찰하여 변화가 일어날 때 알림을 받고, `useSyncExternalStore`를 통해 컴포넌트의 리렌더링을 트리거합니다.


### 정리

Tanstack Query의 전체적인 데이터 흐름은 네 가지 요소가 서로 연결되어 완성됩니다

컴포넌트에서 `useQuery`를 호출하면 내부적으로 먼저 `Observer`가 생성됩니다. 
이 옵저버는 곧바로 `QueryCache`에 접근해 적절한 Query를 확보합니다. 캐시에 이미 같은 키의 쿼리가 존재한다면 기존 인스턴스를 재사용하고, 없다면 새로운 Query를 만들어 캐시에 등록합니다.

이후 Query는 네트워크 요청을 실행하며, 내부 상태머신을 따라 loading에서 success 혹은 error로 전이합니다. 상태가 바뀌는 순간마다 Query는 자신을 구독 중인 옵저버들에게 알림을 보내고, 옵저버는 이를 받아 React 쪽으로 전달합니다.

결국 <b>React 컴포넌트는 useSyncExternalStore를 통해 옵저버가 전달한 “스토어 변경” 신호를 감지하고, 필요한 순간에만 리렌더링을 수행</b>합니다.

정리하자면, `QueryClient`가 전체를 관리하고, `QueryCache`가 쿼리를 보관하며, `Query`는 상태머신으로 동작하고, Observer가 React와 연결하는 구조가 Tanstack Query의 핵심입니다.

## Reference

- [Inside React Query](https://tkdodo.eu/blog/inside-react-query)
- [Under the Hood of React Query: A Deep Dive into Its Internal Mechanics](https://medium.com/@janardhan.roh/under-the-hood-of-react-query-a-deep-dive-into-its-internal-mechanics-ee51c0ce076e)
- [React Query 톺아보기](https://tech.kakaoent.com/front-end/2023/230720-react-query/)