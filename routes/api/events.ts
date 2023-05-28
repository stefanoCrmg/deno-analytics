import * as DB from "@/utils/db.ts"

import * as RTE from "https://esm.sh/fp-ts/ReaderTaskEither"
import * as TE from "https://esm.sh/fp-ts/TaskEither"
import * as O from "https://esm.sh/fp-ts/Option"
import * as E from "https://esm.sh/fp-ts/Either"
import { apply, flow, pipe } from "https://esm.sh/fp-ts/function"

import * as t from "https://esm.sh/io-ts"

import { Handlers } from "$fresh/server.ts"

const SomeCodec = t.readonly(t.type({
  key: t.string,
  value: t.string,
}))

type FakeType = t.TypeOf<typeof SomeCodec>

export const handler: Handlers = {
  async POST(req) {
    const body = await req.json() as FakeType
    const run = pipe(
      DB.set([body.key], body.value),
      (kvQuery) =>
        pipe(
          DB.connectToKV,
          TE.flatMap((kv) => kvQuery({ kv })),
          TE.match(
            (_) => {
              DB.logger.error(`Err while posting: ${_._tag}`)
              return new Response(JSON.stringify({ type: _._tag }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              })
            },
            () => {
              DB.logger.info(`POSTed successfully`)
              return new Response(undefined, { status: 204 })
            },
          ),
        ),
    )

    return run()
  },

  GET(req) {
    const keyParams = new URL(req.url).searchParams.get("key")

    if (!keyParams) {
      return new Response(undefined, { status: 404 })
    }

    const run = pipe(
      DB.get(
        [keyParams],
        t.unknown,
      ),
      (kvQuery) =>
        pipe(
          DB.connectToKV,
          TE.flatMap((kv) => kvQuery({ kv })),
          TE.match(
            (_) => {
              DB.logger.error(`Err while getting: ${JSON.stringify(_)}`)
              return new Response(JSON.stringify({ type: _._tag }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              })
            },
            (stuff) => {
              DB.logger.info(`Got successfully`)
              return new Response(JSON.stringify(stuff), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              })
            },
          ),
        ),
    )
    return run()
  },
}
