(function (window, io) {
	/* eslint-disable no-var */
	/* eslint-disable no-console */

	var versions = {}
	var socket = io.connect()
	var initialLoad = true

	function $(id) {
		return document.getElementById(id)
	}

	function c(classname) {
		return document.getElementsByClassName(classname)
	}

	function getChannel(branches) {
		var channel = 'development'
		if (branches.indexOf('beta') !== -1) {
			channel = 'beta'
		}
		if (branches.indexOf('master') !== -1) {
			channel = 'stable'
		}

		return channel
	}

	function getCurrentChannel() {
		for (let v = 0; v < versions.versions.length; v++) {
			var ver = versions.versions[v]
			var channel = getChannel(ver.branches)
			if (ver.hash === versions.currentHash) {
				return channel
			}
		}
	}

	function removeOptions(selectbox) {
		for (var i = selectbox.options.length - 1; i >= 0; i--) {
			selectbox.remove(i)
		}
	}

	function populateVersions() {
		var selectVersions = $('versions')
		var selectedChannel = $('channels')
		var selectedChannelName = selectedChannel.options[selectedChannel.selectedIndex].value
		removeOptions(selectVersions)
		var o = new window.Option('(select a version)', '')
		selectVersions.options[selectVersions.options.length] = o

		for (let v = 0; v < versions.versions.length; v++) {
			var ver = versions.versions[v]
			var channel = getChannel(ver.branches)
			if (selectedChannelName === channel) {
				selectVersions.options[selectVersions.options.length] = new window.Option(ver.tag + ' (' + selectedChannelName + ')', ver.hash)
				if (ver.hash === versions.currentHash) {
					selectVersions.options[selectVersions.options.length - 1].selected = 'selected'
				}
			}
			if (ver.hash === versions.currentHash) {
				var currentVersionLables = c('current-version')
				for (var i = 0; i < currentVersionLables.length; i++) {
					currentVersionLables[i].innerHTML = ver.tag + ' (' + channel + ' channel)'
				}
			}
		}

		if (initialLoad) {
			var idx = (selectVersions.selectedIndex)
			if (idx === 1) {
				$('hint-success').style.display = ''
			} else {
				$('hint-warning').style.display = ''
			}
		}
		initialLoad = false
	}

	function useVersion(e) {
		e.disabled = 'disabled' // eslint-disable-line no-param-reassign
		var selectVersions = $('versions')
		var commit = selectVersions.options[selectVersions.selectedIndex].value
		socket.emit('checkout', {
			commit
		})
	}

	socket.on('connected', function (data) {
		console.log('log connected')
		$('title').innerHTML = data.package.name + ' ' + data.package.version
		socket.emit('init', {})
	})

	socket.on('log', function (data) {
		console.info('log', data)
		var d = JSON.stringify(data, ' ', 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')
		d = new Date() + ' ' + d
		$('log').innerHTML = $('log').innerHTML + '<br>' + d
	})

	socket.on('error', function (data) {
		console.error('log', data)
		var d = JSON.stringify(data, ' ', 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')
		d = new Date() + ' ' + d
		$('log').innerHTML = $('log').innerHTML + '<br>' + d
	})

	socket.on('checkout-done', function () {
		console.info('log')
		window.location.reload()
	})

	socket.on('loaded', function (data) {
		versions = data
		$('progress').style.display = 'none'
		$('main').style.display = ''
		console.info('loaded', data)
		console.info('log', data)
		var d = JSON.stringify(data, ' ', 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')
		d = new Date() + ' ' + d
		$('log').innerHTML = $('log').innerHTML + '<br>' + d
		$('channel-' + getCurrentChannel()).selected = 'selected'
		populateVersions()
	})

	window.useVersion = useVersion // eslint-disable-line no-param-reassign
	window.populateVersions = populateVersions // eslint-disable-line no-param-reassign
})(window, window.io)