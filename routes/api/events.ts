import * as DB from "@/utils/db.ts"

import * as RTE from "https://esm.sh/fp-ts@2.16.0/ReaderTaskEither"
import * as TE from "https://esm.sh/fp-ts@2.16.0/TaskEither"
import * as T from "https://esm.sh/fp-ts@2.16.0/Task"
import * as O from "https://esm.sh/fp-ts@2.15.0/Option"
import * as E from "https://esm.sh/fp-ts@2.16.0/Either"
import { apply, flow, pipe } from "https://esm.sh/fp-ts@2.16.0/function"

import * as t from "https://esm.sh/io-ts@2.2.20"

import { Handler, Handlers } from "$fresh/server.ts"

const SomeCodec = t.readonly(t.type({
  key: t.string,
  value: t.string,
}))

type FakeType = t.TypeOf<typeof SomeCodec>

const sendOK: () => T.Task<Response> = () =>
  T.of(new Response(undefined, { status: 204 }))
const sendContentOK: (u: unknown) => T.Task<Response> = (u) =>
  T.of(new Response(JSON.stringify(u), { status: 200 }))
const sendBadRequest = (err: unknown): T.Task<Response> =>
  T.of(new Response(JSON.stringify(err), { status: 400 }))
const sendNotFound = () => T.of(new Response(undefined, { status: 404 }))

const parseRequestBody = (
  req: Request,
): TE.TaskEither<DB.DecodingFailure, FakeType> =>
  TE.tryCatch(
    () => req.json() as Promise<FakeType>,
    () => new DB.DecodingFailure([]),
  )

const parseAndSaveToDB = (
  req: Request,
): RTE.ReaderTaskEither<
  DB.DbContextEnv,
  DB.DecodingFailure | DB.KvSetError,
  Deno.KvCommitResult
> =>
  pipe(
    parseRequestBody(req),
    RTE.fromTaskEither,
    RTE.flatMap((body) => DB.set([body.key], body.value)),
  )

const postTask: Handler = (req: Request) =>
  pipe(
    parseAndSaveToDB(req),
    RTE.tapError((e) =>
      pipe(
        RTE.ask<DB.DbContextEnv>(),
        RTE.flatMapIO(({ logger }) => () =>
          logger.error(`Err while posting: ${e._tag}`)
        ),
      )
    ),
    DB.provideEnv(),
    TE.matchE(sendBadRequest, () => sendOK()),
    (execTask) => execTask(),
  )

const getTask = (req: Request) => {
  const keyParams = new URL(req.url).searchParams.get("key")

  if (!keyParams) {
    return sendNotFound()()
  }

  return pipe(
    DB.get(
      [keyParams],
      t.unknown,
    ),
    DB.provideEnv(),
    TE.matchE(sendBadRequest, sendContentOK),
    (execTask) => execTask(),
  )
}

export const handler: Handlers = {
  POST: postTask,
  GET: getTask,
}
