import * as RTE from "https://esm.sh/fp-ts/ReaderTaskEither"
import * as TE from "https://esm.sh/fp-ts/TaskEither"
import * as O from "https://esm.sh/fp-ts/Option"
import * as E from "https://esm.sh/fp-ts/Either"
import { apply, flow, pipe } from "https://esm.sh/fp-ts/function"

import * as t from "https://esm.sh/io-ts"
import Logger from "https://deno.land/x/logger/logger.ts"

export const logger = new Logger()

const runReaderTaskEither: <R, E, A>(
  r: R,
) => (reader: RTE.ReaderTaskEither<R, E, A>) => TE.TaskEither<E, A> = apply

class DecodingFailure {
  readonly _tag = "DecodingFailure"
  constructor(readonly errors: t.Errors) {}
}
class KvConnectingError {
  readonly _tag = "KvConnectingError"
  constructor(readonly error: unknown) {}
}

class KvSetError {
  readonly _tag = "KvSetError"
  constructor(readonly error: unknown) {}
}

class KvReadError {
  readonly _tag = "KvReadError"
  constructor(readonly error: unknown) {}
}
type DbEnv = {
  readonly kv: Deno.Kv
}

export type KvErrors = KvConnectingError | KvSetError

export const connectToKV: TE.TaskEither<KvConnectingError, Deno.Kv> = TE
  .tryCatch(() => Deno.openKv(), (e) => new KvConnectingError(e))

export const set = <A>(
  key: Deno.KvKey,
  value: A,
): RTE.ReaderTaskEither<DbEnv, KvSetError, Deno.KvCommitResult> =>
  RTE.asksReaderTaskEither(({ kv }) =>
    pipe(
      TE.tryCatch(() => kv.set(key, value), (reason) => new KvSetError(reason)),
      RTE.fromTaskEither,
    )
  )

const validateEntry = <A, O = A>(schema: t.Type<A, O, unknown>) =>
(
  entryMaybe: Deno.KvEntryMaybe<unknown>,
): E.Either<DecodingFailure, O.Option<A>> =>
  pipe(
    entryMaybe.value,
    O.fromNullable,
    O.match(
      () => E.right(O.none),
      flow(schema.decode, E.bimap((_) => new DecodingFailure(_), O.some)),
    ),
  )

export const get = <A, O = A>(
  key: Deno.KvKey,
  schema: t.Type<A, O>,
): RTE.ReaderTaskEither<DbEnv, KvReadError | DecodingFailure, O.Option<A>> =>
  RTE.asksReaderTaskEither(({ kv }) =>
    pipe(
      TE.tryCatch(() => kv.get(key), (reason) => new KvReadError(reason)),
      TE.flatMapEither(validateEntry(schema)),
      RTE.fromTaskEither,
    )
  )

export const runKv =
  () => <E, A>(rte: RTE.ReaderTaskEither<DbEnv, E, A>): Promise<void> =>
    pipe(
      connectToKV,
      TE.chain((kv) => runReaderTaskEither({ kv })(rte)),
      TE.match(
        (err) => logger.error(`${JSON.stringify(err)}`),
        (succ) => logger.info(`${JSON.stringify(succ)}`),
      ),
      (task) => task(),
    )
