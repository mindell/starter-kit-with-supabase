Dynamic API was called outside request
======================================

[Why This Error Occurred]
------------------------------------------------------------------------------------------------------------------

A Dynamic API was called outside a request scope. (Eg.: Global scope).

Note that Dynamic APIs could have been called deep inside other modules/functions (eg.: third-party libraries) that are not immediately visible.

[Possible Ways to Fix It]
------------------------------------------------------------------------------------------------------------------

Make sure that all Dynamic API calls happen in a request scope.

Example:

app/page.js

```
import { cookies } from 'next/headers' - const cookieStore = await cookies()export default async function Page() {+ const cookieStore = await cookies()  return ...}
```

app/foo/route.js

```
import { headers } from 'next/headers' - const headersList = await headers()export async function GET() {+ const headersList = await headers()  return ...}
```
