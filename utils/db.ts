import * as RTE from "https://esm.sh/fp-ts@2.16.0/ReaderTaskEither"
import * as TE from "https://esm.sh/fp-ts@2.16.0/TaskEither"
import * as O from "https://esm.sh/fp-ts@2.15.0/Option"
import * as E from "https://esm.sh/fp-ts@2.16.0/Either"
import { flow, pipe } from "https://esm.sh/fp-ts@2.16.0/function"
import * as t from "https://esm.sh/io-ts@2.2.20"
import Logger from "https://deno.land/x/logger@v1.1.2/logger.ts"

export class DecodingFailure {
  readonly _tag = "DecodingFailure"
  constructor(readonly errors: t.Errors) {}
}
class KvConnectingError {
  readonly _tag = "KvConnectingError"
  constructor(readonly error: unknown) {}
}

export class KvSetError {
  readonly _tag = "KvSetError"
  constructor(readonly error: unknown) {}
}

class KvReadError {
  readonly _tag = "KvReadError"
  constructor(readonly error: unknown) {}
}
type DenoKvEnv = {
  readonly kv: Deno.Kv
}

type LoggerEnv = {
  readonly logger: Logger
}

export type DbContextEnv = LoggerEnv & DenoKvEnv
export type KvErrors = KvConnectingError | KvSetError

export const connectToKV: () => TE.TaskEither<KvConnectingError, Deno.Kv> =
  () =>
    TE
      .tryCatch(() => Deno.openKv(), (e) => new KvConnectingError(e))

export const set = <A>(
  key: Deno.KvKey,
  value: A,
): RTE.ReaderTaskEither<DenoKvEnv, KvSetError, Deno.KvCommitResult> =>
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
): RTE.ReaderTaskEither<
  DenoKvEnv,
  KvReadError | DecodingFailure,
  O.Option<A>
> =>
  RTE.asksReaderTaskEither(({ kv }) =>
    pipe(
      TE.tryCatch(() => kv.get(key), (reason) => new KvReadError(reason)),
      TE.flatMapEither(validateEntry(schema)),
      RTE.fromTaskEither,
    )
  )

const createEnv = (): TE.TaskEither<KvConnectingError, DbContextEnv> => {
  const logger = new Logger()
  return pipe(
    connectToKV(),
    TE.map((kv) => ({ kv, logger })),
  )
}

export const provideEnv = () =>
<E, A>(
  rte: RTE.ReaderTaskEither<DbContextEnv, E, A>,
): TE.TaskEither<KvConnectingError | E, A> =>
  pipe(
    createEnv(),
    TE.flatMap((env) =>
      pipe(
        rte(env),
        TE.tapError((e) =>
          TE.fromIO(() =>
            env.logger.error(
              `[${performance.now()} || ERROR] ${JSON.stringify(e)}`,
            )
          )
        ),
      )
    ),
  )
