function signIn() {
	window.name = JSON.stringify({
		user: 'User1'
	})
	location.reload()
}

function signOut() {
	window.name = JSON.stringify({
		user: undefined
	})
	location.reload()
}

function getUser() {
	return JSON.parse(window.name).user || undefined
}