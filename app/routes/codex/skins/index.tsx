import { json } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"
import { getItems } from "~/data/items.server"
import { SkinSchema } from "~/data/schemas.server"

export const loader = async () => {
  const items = await getItems(SkinSchema)
  return json({ title: "Skins", items })
}

export default function Skins() {
  const { items } = useLoaderData<typeof loader>()

  return (
    <>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          return (
            <li
              className=" group relative m-2 overflow-hidden rounded bg-white shadow hover:shadow-lg"
              key={item.id}
            >
              <Link to={item.slug} className="block h-full w-full">
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    alt=""
                    src={`https://img.darkti.de/pngs/${item.preview_image}.png`}
                    className="h-full transition duration-75 group-hover:scale-105"
                  />
                </div>
                <div className="p-4 text-lg font-bold">{item.display_name}</div>
              </Link>
            </li>
          )
        })}
      </ul>
      {items.length < 1 ? (
        <div className="px-4 py-6 sm:px-0">
          <div className="grid h-96 place-content-center rounded-lg border-4 border-dashed border-gray-200">
            <span className="font-heading text-lg font-black text-neutral-400">
              No results
            </span>
          </div>
        </div>
      ) : null}
    </>
  )
}
