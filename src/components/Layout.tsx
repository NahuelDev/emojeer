import type { PropsWithChildren } from "react"

export const PageLayout = (props: PropsWithChildren) => {
    return (
        <main className="flex h-screen justify-center">
            <div className="h-full w-full md:max-w-2xl overflow-y-scroll border-x">
                    {props.children}
            </div>
        </main>
    )
}
