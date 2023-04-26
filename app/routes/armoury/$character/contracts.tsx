import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
} from "@remix-run/react"
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import { useEffect, useState } from "react"
import { z } from "zod"
import { zx } from "zodix"
import { getAuthToken } from "~/data/authtoken.server"
import { authenticator } from "~/services/auth.server"
import { getCharacterContracts } from "~/services/darktide.server"
import { classnames } from "~/utils/classnames"

export let handle = "contracts"

export async function action({ params, request }: ActionArgs) {
	let { character: characterId } = zx.parseParams(params, {
		character: z.string(),
	})
	let user = await authenticator.isAuthenticated(request, {
		failureRedirect: "/login",
	})

	let auth = await getAuthToken(user.id)

	if (!auth) return json({ error: "No auth" })

	let formData = await request.formData()
	let taskId = formData.get("reroll-task")

	if (taskId) {
		// Not implemented yet
		// let result = await deleteCharacterTask(auth, characterId, taskId)
	}

	return json(null)
}

// TODO: type me
// @ts-expect-error
function criteriaToDescription(criteria) {
	switch (criteria.taskType) {
		case "CompleteMissions":
			return `Complete ${criteria.count} missions`
		case "CollectResource":
			return `Collect ${criteria.count} ${criteria.resourceTypes[0]}`
		case "KillBosses":
			return `Kill ${criteria.count} monstrosities`
		case "KillMinions":
			return `Kill ${criteria.count} ${criteria.enemyType} with ${criteria.weaponType}`
		default:
			return "Unknown task"
	}
}

export async function loader({ params, request }: LoaderArgs) {
	let { character: characterId } = zx.parseParams(params, {
		character: z.string(),
	})
	let user = await authenticator.isAuthenticated(request, {
		failureRedirect: "/login",
	})

	let auth = await getAuthToken(user.id)

	if (auth) {
		let contract = await getCharacterContracts(auth, characterId)
		if (!contract) {
			return json(null)
		}

		let tasks = contract.tasks.map((task) => {
			let description = criteriaToDescription(task.criteria)
			let reward = `${task.reward.amount} ${task.reward.type}`

			return {
				id: task.id,
				description,
				reward,
				difficulty: task.criteria.complexity,
				complete: task.fulfilled,
				rewarded: task.rewarded,
				current: task.criteria.value,
				target: task.criteria.count,
				percentage: (task.criteria.value / task.criteria.count) * 100,
			}
		})

		let numComplete = tasks.reduce(
			(sum, task) => sum + (task.complete ? 1 : 0),
			0
		)

		return json({
			tasks,
			refreshTime: contract.refreshTime,
			numComplete,
			allComplete: numComplete === tasks.length,
			percentage: (numComplete / tasks.length) * 100,
			completionReward: `${contract.reward.amount} ${contract.reward.type}`,
			rerollCost: `${contract.rerollCost.amount} ${contract.rerollCost.type}`,
		})
	}

	return json(null)
}

let difficultyBorder: Record<string, string> = {
	easy: "border-l-green-400",
	medium: "border-l-orange-400",
	hard: "border-l-red-400",
}

let difficultyColor: Record<string, string> = {
	easy: "text-green-600",
	medium: "text-orange-600",
	hard: "text-red-600",
}

function timeUntil(date: number) {
	var seconds = Math.floor((date - Date.now()) / 1000)

	var interval = seconds / 31536000

	if (interval > 1) {
		return Math.floor(interval) + " years"
	}
	interval = seconds / 2592000
	if (interval > 1) {
		return Math.floor(interval) + " months"
	}
	interval = seconds / 86400
	if (interval > 1) {
		return Math.floor(interval) + " days"
	}
	interval = seconds / 3600
	if (interval > 1) {
		return Math.floor(interval) + " hours"
	}
	interval = seconds / 60
	if (interval > 1) {
		return Math.floor(interval) + " minutes"
	}
	return Math.floor(seconds) + " seconds"
}

export default function Contracts() {
	let contract = useLoaderData<typeof loader>()
	let navigation = useNavigation()
	let actionData = useActionData<typeof action>()

	let [timeLeft, setTimeLeft] = useState("...")

	useEffect(() => {
		let intervalId = setInterval(() => {
			if (contract?.refreshTime) {
				let refreshTime = parseInt(contract?.refreshTime, 10)
				setTimeLeft(timeUntil(refreshTime))
			}
		}, 1000)
		return () => clearInterval(intervalId)
	}, [contract?.refreshTime])

	if (!contract) {
		return null
	}

	return (
		<Form
			className="flex w-full flex-col bg-neutral-200 p-4 shadow-inner"
			method="post"
		>
			<div className="mb-2">Refreshes in {timeLeft}</div>
			<div
				className={classnames(
					"grid w-full grow grid-cols-3 gap-4",
					navigation.state !== "idle" && "opacity-50"
				)}
			>
				{contract.tasks.map((task) => (
					<div
						key={task.id}
						className={classnames(
							"relative flex flex-col justify-between border-2 border-neutral-400 bg-white p-2 shadow transition",
							difficultyBorder[task.difficulty],
							task.complete && "opacity-50"
						)}
					>
						<div
							className={classnames(
								"mb-2 font-heading text-lg",
								task.complete && "line-through"
							)}
						>
							{task.description}
						</div>
						<div className="mb-2 flex flex-row justify-between">
							<div className="flex flex-row gap-2">
								<div className="font-bold">Difficulty:</div>
								<div
									className={classnames(
										"capitalize",
										difficultyColor[task.difficulty]
									)}
								>
									{task.difficulty}
								</div>
							</div>
							<div className="flex flex-row gap-2">
								<div className="font-bold">Progress:</div>
								<div>
									{task.current} / {task.target}
								</div>
							</div>
							<div className="flex flex-row gap-2">
								<div className="font-bold">Reward:</div>
								<div>{task.reward}</div>
							</div>
						</div>
						<div className="mb-2">
							<div className="relative w-full border border-amber-400 p-px">
								<div
									style={{ width: `${task.percentage}%` }}
									className="z-2 absolute left-0 top-0 h-full border border-white bg-amber-400"
								/>
								<div className="z-1 isolate m-px mx-1 font-heading text-xs leading-none text-white">
									{Math.round(task.percentage)}%
								</div>
							</div>
						</div>
						<div className="mb-2">
							<button
								type="submit"
								name="reroll-task"
								value={task.id}
								disabled={navigation.state != "idle"}
								className="inline-flex shrink cursor-pointer flex-row items-center gap-2 rounded border bg-white p-2 text-neutral-600 shadow hover:bg-neutral-50 disabled:cursor-not-allowed disabled:bg-neutral-200"
							>
								Replace task for {contract?.rerollCost}
							</button>
						</div>
					</div>
				))}

				<div className="relative flex flex-col justify-between border-2 border-neutral-600 bg-white p-2 shadow transition">
					<div
						className={classnames(
							"mb-2 font-heading text-lg",
							contract.allComplete && "line-through"
						)}
					>
						Contract completion
					</div>
					<div className="mb-2 flex flex-row justify-between">
						<div className="flex flex-row gap-2">
							<div className="font-bold">Progress:</div>
							<div>
								{contract.numComplete} / {contract.tasks.length}
							</div>
						</div>
						<div className="flex flex-row gap-2">
							<div className="font-bold">Reward:</div>
							<div>{contract.completionReward}</div>
						</div>
					</div>
					<div className="mb-2">
						<div className="relative w-full border border-amber-400 p-px">
							<div
								style={{ width: `${contract.percentage}%` }}
								className="z-2 absolute left-0 top-0 h-full border border-white bg-amber-400"
							/>
							<div className="z-1 isolate m-px mx-1 font-heading text-xs leading-none text-white">
								{Math.round(contract.percentage)}%
							</div>
						</div>
					</div>
				</div>
			</div>
		</Form>
	)
}
