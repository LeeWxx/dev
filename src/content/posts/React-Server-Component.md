---
title: React Server Component(RSC)에 대하여
date: '2025-06-11'
description: React Server Component의 원리
thumbnail: '/images/rsc_logo.png'
tags: ['Next', 'RSC']
---

## RSC의 배경
![Image](https://lh3.googleusercontent.com/d/12I0SaeyIPyhDEwi7-jZkGX8g1pJ9SDYf)

### CSR

![Image](https://lh3.googleusercontent.com/d/1rXR1aZsjSDxD6K2-P3a-q05ya-bUaQwI)

이전부터 주류로 자리잡은 `SPA(Single Page Application)`에서 `CSR(Clinet Side Rendering)`을 구현하기 위하여 `React` 같은 라이브러리를 주로 사용해왔습니다.
SPA에서는 클라이언트에서 요청을 보내면 웹 서버는 `<div id =root></div>`와 더불어 React 라이브러리와 애플리케이션 코드가 담긴 자바스크립트 참조가 포함된 HTML을 전송하는데요, 이 때 해당 코드들은
브라우저에서 UI를 생성하고, 그 후 사용자는 페이지 전환 없이 부분적으로 업데이트 되는 DOM을 보며 자연스러운 경험을 체감할 수 있었습니다. 

그러나 CSR은 초기 로딩할 때 큰 용량의 자바스크립트 번들을 다운 받아야 하며, js가 브라우저에서 Ui를 생성하기 전 검색엔진이 해당 페이지의 DOM 구조를 인식할 수 없는 문제가 발생했습니다.

### SSR 

![Image](https://lh3.googleusercontent.com/d/1kMc7oX2le8fOF3mQnll2-Ob7Q7Pd0rCz)

위와 같은 한계를 극복하기 위해 도입된 개념이 서버 사이드 렌더링, `SSR(Server Side Rendering)`입니다. SSR은 브라우저에서 데이터를 서버에 요청하는 것이 아닌, 서버단에서 HTML을 미리 완성하여
클라이언트에 전송하는 방식으로, CSR에 비해 초기 로딩 속도가 줄어들며 서버가 React 컴포넌트를 변환하여 HTML로 보내기에 브라우저는 바로 의미있는 컨텐츠를 확인 가능할 수 있죠.

이제 CSR의 단점을 극복했으니, SSR이 가장 나은 방법일까요?

다음과 같은 리액트 컴포넌트를 만들었다고 해봅시다.

```jsx

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

```

서버는 해당 컴포넌트를 `renderToString` 함수를 통해 HTML로 변환하여 클라이언트에 전송합니다.


```js
import { renderToString } from 'react-dom/server';

const htmlString = renderToString(<Counter />);
// => '<button>0</button>'
```

그렇다면 클라이언트가 받는 응답의 본문은 다음과 같을 것입니다.

```html
<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <div id="root">
      <button>0</button>
    </div>
    <script src="/static/js/main.bundle.js"></script>
  </body>
</html>
```


### Hydration

위 응답을 받은 뒤 클라이언트는 UI 상으로는 완성된 화면을 볼 수 있지만, 아직은 렌더링 된 버튼과의 상호작용이 없습니다.
SSR에서 클라이언트가 받은 HTML은 정적인 마크업 상태이기 때문이죠.
HTML 응답에 함께 내려온 번들을 내려받은 뒤, 실행하여 이벤트 리스너를 실제 DOM 노드에 붙여야 합니다.

바로 이 과정이 `하이드레이션(Hydration)`입니다. 

이벤트 리스너 또는 hook과 같이 브라우저 api에 의존하는 기능은 서버 사이드 환경에서 연결할 수 없고, 사용자가
DOM 노드와 상호작용하기 까지는 어차피 일부 시간이 필요하므로 먼저 정적인 화면을 보내준 뒤 그 이후 Js 번들을 받아 이벤트와 연결하는 것이죠.

**물론 일부 마케팅을 목적으로하는 페이지와 같이 인터랙션이 필요없는 사이트에서는 하이드레이션 과정이 필요없을 수 있습니다.*

### SSR의 한계

SSR은 `All or Nothing`입니다. 
SSR에서 페이지에 prop을 넣어주기 위해 사용되는 개념인 `getServerSideProps`은 페이지단으로 동작하기에
정적인 HTML을 내려받고 Js 번들을 전부 다운 받은 뒤 하이드레이션을 마쳐야 그 이후부터 상호작용이 가능합니다.

즉 페이지가 복잡해질수록 초기 로딩시 내려받는 Js 번들의 크기가 증가한다는 것이죠.

또한 페이지의 모든 데이터를 서버에서 한번에 받아오기 때문에 지연적인 데이터 요청이 어렵다는 점도 있습니다.

아래 예시를 확인해보겠습니다.

간단한 유저 프로필과 스탯창을 확인하는 대시보드를 개발한다고 해봅시다.

```jsx
import React from 'react';
import { LineChart } from 'recharts';

export default function Dashboard({ user, stats }) {
  return (
    <div>
      <h1>환영합니다! {user.name}님</h1>
      <LineChart data={stats} width={600} height={300} />
    </div>
  );
}

export async function getServerSideProps(context) {
  const userRes  = await fetch('https://api/user',);
  const user     = await userRes.json();

  const statsRes = await fetch('https://api/stats');
  const stats    = await statsRes.json();

  return {
    props: { user, stats }
  };
}
```

그렇다면 SSR에서는 위와 같이 코드를 작성할 수 있을 것입니다.

이 경우 다음과 같은 문제가 존재합니다.

1. `recharts`와 같이 사이즈가 큰 라이브러리가 클라이언트 번들에 포함됩니다.
2. SSR에서는 서버 런타임에서 실행되는 `getServerSideProps`안의 모든 api 호출이 끝난뒤에 HTML을 생성하고 응답을 보내기 때문에
느린 api 하나가 전체의 응답을 지연시킬 수 있습니다.


이 문제를 어떻게 해결할 수 있을까요?

## RSC

![Image](https://lh3.googleusercontent.com/d/125m3_geGFUZDKl8HJu8cnp8mcrLxJDLs)

`React Server Components(RSC)`는 React 팀이 제안한 새로운 컴포넌트 유형으로 서버에서만 실행 되며 HTML 또는 청크를 클라이언트에 
전송합니다.

클라이언트에는 서버단의 코드나 라이브러리가 내려가지 않기에 브라우저에서 로딩하는 Js 번들 크기를 줄일 수 있죠. 


위에서 살펴본 SSR의 한계를 다시 봐볼까요 ? 

1. 번들 크기 문제

일반적인 `getServerSideProps`를 사용하는 SSR은 `import { LineChart } from 'recharts'`
같은 차트 라이브러리가 페이지에 포함되면 브라우저는 해당 라이브러리가 포함된 번들을 다운 받고 실행합니다. 

하지만 RSC의 경우 무거운 렌더링 로직을 서버 사이드 컴포넌트로 분리하고 클라이언트에는 마크업만 전달하는 형태로 
이를 개선할 수 있습니다.

```js
import { LineChart } from 'recharts';  

export default function DashboardChart({ stats }) {
  return <LineChart data={stats} width={600} height={300} />;
}
```

위 코드의 경우 브라우저 단으로 내려가는 번들에 `recharts` 라이브러리가 포함되지 않기에 
초기 다운로드 속도가 개선됩니다.


2. 데이터 fetching 지연

앞서 설명 드렸듯이  `getServerSideProps`를 사용하는 SSR은 페이지의 모든 api 콜이 완료되어야 HTML 응답이 시작됩니다.
그렇기에 느린 api 하나가 전체 페이지 로딩을 지연시킬 수 있죠. 

반면 RSC는 컴포넌트 단위로 동작하기에 api 호출을 분할 할 수 있습니다. 각 컴포넌트마다 독립적인 fetch를 수행하고 이에 더해
`Suspense 스트리밍`을 활용한다면 먼저 데이터를 받아온 컴포넌트부터 청크 단위로 클라이언트에 전송할 수 있습니다.

위 예시에서 `/stats` api가 `/user`에 비해 상대적으로 느려 전체 페이지의 병목을 유발했다면, RSC에서는 다음과 같은 코드가 가능합니다.

```jsx
import { Suspense } from 'react';
import Greeting from './Greeting.server';
import DashboardChart from './DashboardChart.server';

export default function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<p>사용자 정보를 불러오는 중…</p>}>
        <Greeting />
      </Suspense>
      <Suspense fallback={<p>차트를 생성하는 중…</p>}>
        <DashboardChart />
      </Suspense>
    </div>
  );
}
```

`Greeting` 컴포넌트의 api 응답이 준비되면 해당 HTML부터 먼저 스트리밍해 표시하고,
`DashboardChart` 데이터가 준비되는 대로 그 결과를 이어서 보내므로,
전체가 준비될 때까지 기다리지 않아도 화면 일부를 빠르게 볼 수 있습니다.


#### 인터랙션 처리 방식

SSR에서는 전체 페이지 마크업을 내려준 뒤 js번들을 다운받는 형태로 인터랙션을 불어넣습니다.
RSC도 마찬가지입니다. 
SSR이든 RSC든 정적 HTML을 먼저 내려주고, 클라이언트 번들을 다운로드하여 하이드레이션 과정을 거쳐야 상호작용을 활성화한다는 점은 같습니다. 

다만 RSC에서는 오직 클라이언트 컴포넌트에 해당하는 js 로직을 번들에 포함하므로 불필요한 번들 사이징을 줄일 수 있는 것이죠.

또한 전통적인 SSR에서는 서버가 완성된 HTML을 한번에 응답하지만 RSC는 청크 단위로 스트리밍하여 필요할 때 해당 js를 동적 로드해 
하이드레이션한다는 차이도 있습니다.

RSC가 이처럼  `필요한 부분만 동적으로 로드`하고 `서버 컴포넌트 HTML을 단계별로 스트리밍`하는 동작 방식은 
`RSC Payload`라는 전송 규격 덕분에 실현됩니다.

### RSC Payload

`RSC 페이로드(React Server Component Payload)`는 서버 컴포넌트가 렌더링한 결과를 클라이언트로 전달하기 위해
사용하는 바이트 단위의 직렬화된 데이터 스트림을 말합니다.
일반적인 Json 형태와는 달리, React 고유의 `Flight 프로토콜` 형식으로 구성되어 있습니다.


![Image](https://lh3.googleusercontent.com/d/1TbqtSCPwJaPwdiR7DvTK4NBHkfz3NVkL)

RSC는 다음 세개의 항목으로 이루어져 있습니다.

1. 서버 컴포넌트의 렌더 결과 HTML
2. 클라이언트 컴포넌트의 placeholeder
3. Props 전달 정보 

서버는 `renderToPipeableStream` 같은 API로 React 트리를 각 청크 단위로 렌더링하며, 각 청크를 
RSC Payload 형식으로 클라이언트에 전송합니다.

클라이언트는 이 페이로드를 받아 서버 컴포넌트의 청크는 DOM에 바로 삽입하며 placeholder 청크의 경우 이후 동적 import를
통해 클라이언트 번들에서 해당 모듈을 가져와 하이드레이션합니다.

### renderToPipeableStream

앞서 전통적인 SSR은 `renderToString`을 통해 HTML 생성해 클라이언트에 응답한다고 소개했습니다. 

```js
const html = renderToString(<App />);
res.send(`<!DOCTYPE html><html><body><div id="root">${html}</div><script src="client.js"></script></body></html>`);
```

위 코드와 같이 요청이 들어오면 서버는 트리를 순회해 HTML 문자열을 생성하고, 만들어진 HTML을 응답 바디에 보내는 방식이죠.
이는 CSR에 비해 초기 로딩 속도, SEO적인 측면에서 유리하지만 데이터 로딩이 오래 걸리는 호출이 있을 경우 TTFB(Time To First Byte)가
지연된다는 단점이 존재합니다.

그런데 Node.js 서버는 싱글 스레드와 이벤트 루프 방식으로 동작합니다. 그렇기에 블로킹을 최대한 피하고 
비동기적으로 작업을 처리하는 것이 중요하지만 `renderToString`은 내부적으로 트리를 전부 순회해 HTML 문자열을 생성합니다.
즉, 해당 요청이 오면 HTML을 응답하기까지의 과정에서 이벤트 루프의 다른 작업들이 블로킹 될 수 있다는 것입니다. 특히 무거운 데이터 페칭이 있다면
지연은 더욱 심해지겠죠.

`Suspense` 개념이 SSR에 도입되기 시작하며 이러한 문제는 더욱 부각되었습니다.

특정 컴포넌트를 렌더링 할 때 로딩중에는 fallback UI를 보여주고, 데이터가 준비되면 실제 컨텐츠를 채워주는 패턴을
적용하기 위해서는 `renderToString`은 부적합했던 것이죠.

한번 응답이 끝나면 HTTP 연결이 종료되는 `renderToString`은 이후 준비된 컨텐츠를 보내줄 수 없었기에 다른 방안을 활용해야 했습니다.

React 18에서 도입된 `renderToPipeableStream`은 클라이언트에 데이터를 순차적으로 전송하는 HTTP의 스트리밍이라는 개념을 활용합니다.
HTTP의 스트리밍(chunked encoding)은 클라이언트로부터 요청이 들어오면
서버는 응답을 한번에 다 보내는 것이 아닌 일부부터 순차적으로 전송합니다.


그렇기에 Suspense로 래핑한 컴포넌트의 데이터가 준비되었다면 콜백을 받아 추가적인 HTML을 스트림에 추가로 전송할 수 있는 것입니다.

### RSC의 문제

`Next.js App Router`에서 RSC를 활용하면 페이지 로딩 시 HTML을 먼저 렌더링하여 클라이언트에 전송한 뒤
이어서 RSC Payload를 `<script>` 태그 형태로 주입합니다. 

다음 예시를 보며 자세한 내용을 이해해보죠.

```jsx
import React from 'react';

async function fetchUser() {
  return { name: 'Alice' };
}

export default async function Page() {
  const user = await fetchUser();

  return (
    <main>
      <h1>환영합니다, {user.name}님!</h1>
      <p>서버 컴포넌트에서 렌더링된 초기 콘텐츠</p>
      <NotificationToggle initialEnabled={false} />
    </main>
  );
}
```

위 `Page` 함수 컴포넌트는 서버 환경에서 실행되어 fetchUser()로 사용자 정보를 받아오고, 
`<h1>`과 `<p>`을 포함한 HTML을 생성합니다.

<NotificationToggle>은 버튼 클릭시 상호작용을 처리하는 클라이언트 컴포넌트라고 가정하겠습니다.

Next는 위 서버 컴포넌트 트리를 렌더링 하여 HTML 청크를 브라우저에 전송합니다. 
최종적으로 브라우저가 받은 HTML은 다음과 유사하게 보이죠.

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- 헤더 -->
  </head>
  <body>
    <div id="__next">
      <main>
        <h1>환영합니다, 홍길동님!</h1>
        <p>서버 컴포넌트에서 렌더링된 초기 콘텐츠</p>
        <div data-nextjs-client-component="NotificationToggle">
        </div>
      </main>
    </div>
``` 

이 때의 클라이언트 컴포넌트는 사용자와의 상호작용이 없는 단순히 placeholder의
형태이기 때문에 이후 Js 번들을 통해 hydrate하여 이벤트를 연결해야 합니다.

그렇기에 Next.js는 트리 구조를 직렬화한 RSC 페이로드를 `<script>` 태그로 삽입하여, 클라이언트에
전송합니다.

```html
    <script>
      self.__next_f.push([
        1,
        JSON.stringify([
          '$', 
          'main', 
          null, 
          {
            children: [
              ["$", "h1", null, { children: "환영합니다, 홍길동님!" }],
              ["$", "p", null, { children: "서버 컴포넌트에서 렌더링된 초기 콘텐츠" }],
              [
                "$$client_component_placeholder", 
                {
                  name: "NotificationToggle",
                  props: { initialEnabled: false },
                }
              ]
            ]
          }
        ])
      ]);
    </script>
    <script src="/_next/static/chunks/main.js"></script>
  </body>
</html>
```

서버 컴포넌트 트리의 각 노드(tag, 텍스트 등)와 클라이언트 컴포넌트의 위치 정보를 
`self.__next_f.push` 함수에 담아 호출하는데요,

여기에는 앞서 HTML 마크업에 이미지 포함된 `<h1>`,`<p>` 태그 정보도 중복으로 직렬화되기 때문에
네트워크 전송량이 증가하고 크롤러가 페이지 본문을 파싱할 때 HTML 스크립트 내부 payload를 중복 컨텐츠를 인식할 가능성이 생깁니다.

이처럼 RSC는 클라이언트 번들 크기를 줄여주는 이점을 확보할 수 있지만 중복된 데이터 전송으로 인한 
네트워크 비용이 증가하는 단점이 존재합니다.

그렇기에 Next.js 팀에서는 코드 분할, Suspense 경계 설정등을 통해 불필요한 중복을 최소화하는 패턴을 권장하고 있죠.

관련 이슈: [RSC Payload Optimization - Next.js Discussions](https://github.com/vercel/next.js/discussions/42170)

## Reference

- [Why React Server Components?](https://www.builder.io/blog/why-react-server-components)
- [React Server Components (RSC) without a framework](https://timtech.blog/posts/react-server-components-rsc-no-framework/)
- [Understanding React Server Components](https://www.joshwcomeau.com/react/server-components)
- [Understanding React Server Components](https://vercel.com/blog/understanding-react-server-components)
- [How to Optimize RSC Payload Size](https://vercel.com/guides/how-to-optimize-rsc-payload-size)
- [React Fizz & Flight - Suspense & RSC](https://saengmotmi.netlify.app/react/fizz-flight/)
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [renderToString](https://ko.react.dev/reference/react-dom/server/renderToString)
- [renderToPipeableStream](https://react.dev/reference/react-dom/server/renderToPipeableStream)