import type { AuthToken } from "@prisma/client"
import memoizee from "memoizee"
import { prisma } from "~/data/db.server"

type UpdateArgs = Omit<AuthToken, "id">
export async function updateAuthToken(payload: UpdateArgs) {
	return await prisma.authToken.upsert({
		where: { userId: payload.userId },
		update: payload,
		create: payload,
	})
}

export async function deleteAuthToken(userId: number) {
	try {
		return await prisma.authToken.delete({
			where: { userId },
		})
	} catch (e) {
	} finally {
		getAuthToken.clear()
	}
}

async function _getAuthToken(userId: number) {
	try {
		let auth = await prisma.authToken.findUnique({
			where: { userId },
		})

		if (!auth) return null

		if (auth.expiresAt <= new Date()) {
			try {
				await prisma.authToken.delete({
					where: { userId },
				})
			} catch (e) {}
			return null
		}

		return auth
	} catch (e) {
		console.log(e)
		return null
	}
}

export const getAuthToken = memoizee(_getAuthToken, { maxAge: 5000 })

export async function getExpiringTokens(inNextMinutes: number) {
	let inXMinutes = new Date()
	inXMinutes.setMinutes(inXMinutes.getMinutes() + inNextMinutes)

	return await prisma.authToken.findMany({
		where: {
			expiresAt: {
				lte: inXMinutes,
			},
		},
	})
}
