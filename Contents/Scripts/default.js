// LaunchBar Action Script
include('common.js');

const HOST = 'http://123.56.176.64:88';

const PREFERENCE = [{
	title: 'Open Preference',
	url: `file://${Action.supportPath}/Preferences.plist`,
	icon: 'font-awesome:cog',
	subtitle: 'Press <ENTER> to fill in your mail account and password',
	alwaysShowsSubtitle: true
}];

/**
 * Log user in
 *
 * @return     {boolean}
 */
function login() {
	const username = Action.preferences.UserName;
	const password = Action.preferences.PassWord;

	const result = HTTP.getJSON(
		`${HOST}/AuthorityApi/Login?username=${username}&password=${password}`
	);

	if (result.data) {
		Action.preferences.CRMAppToken = result.data.TokenCode;
		Action.preferences.DisplayName = result.data.DisplayName;
		return true;
	}

	throw new Error('Can not get access token');
}

/**
 * Makes a request to Beacon server
 *
 * @param      {string}  url      The url
 * @param      {object}  options  The options
 * @return     {Request}
 */
function makeRequest(url, options) {
	if (typeof options === 'string') {
		options = {
			method: options
		};
	}

	options.headerFields = options.headerFields || {};
	options.headerFields['CRMApp-Token'] = Action.preferences.CRMAppToken;
	options.resultType = options.resultType || 'json';

	return HTTP.createRequest(url, options);
}

/**
 * List projects of current user
 *
 * @return     {Array}
 */
function listProjects() {
	let projects = [];
	const request = makeRequest(`${HOST}/WorkHoursApi/GetWorkHours`, 'GET');

	if (Action.preferences.Projects && LaunchBar.options.commandKey) {
		// Use cache
		projects = JSON.parse(
			Action.preferences.Projects
		);
	} else {
		// Load from remote
		const result = HTTP.loadRequest(request);
		projects = result.data;
		Action.preferences.Projects = JSON.stringify(projects);
	}

	return projects.map((project) => {
		return {
			badge: project.ProjectOwner,
			title: project.ProjectName,
			icon: 'font-awesome:fa-sticky-note-o',
			action: 'listDetailOfProduct',
			actionArgument: project,
			actionReturnsItems: true,
			children: listDetailOfProduct(project)
		};
	});
}

/**
 * Covnert string to locale date string
 *
 * @param      {string}  str     The string
 * @return     {string}
 */
function str2date(str) {
	const date = new Date(str);
	return date.toLocaleDateString();
}

/**
 * List details of a product
 *
 * @param      {project}  project  The project
 * @return     {Array}
 */
function listDetailOfProduct(project) {
	if (LaunchBar.options.commandKey) {
		return listWorkLoadOptions(project);
	}

	const record = {
		action: 'listWorkLoadOptions',
		actionArgument: project
	}

	return [
		{title: '记录工作量', label: '按 <Enter> 继续', icon: 'font-awesome:fa-edit', ...record},
		{title: project.ProjectName, label: 'Project Name', icon: 'font-awesome:fa-sticky-note-o'},
		{title: project.ProjectOwner, label: 'Owner', icon: 'font-awesome:fa-user-circle'},

		{title: project.PurchaseOrderId, label: 'PO.Num', icon: 'font-awesome:fa-info-circle'},
		{title: project.ProjectItemId, label: 'Project ID', icon: 'font-awesome:fa-info-circle'},
		{title: project.InvoiceNum, label: 'Invoice Num', icon: 'font-awesome:fa-dollar'},

		{title: project.TotalWorkHours.toFixed(0) + 'h', label: 'Total Work Hours', icon: 'font-awesome:fa-calculator'},
		{title: project.CurrentHours.toFixed(0) + 'h', label: 'Current Hours (Might outdated)', icon: 'font-awesome:fa-clock-o'},

		{title: str2date(project.ProjectStartDate), label: 'Start Date', icon: 'font-awesome:fa-calendar'},
		{title: str2date(project.ProjectEndDate), label: 'End Date', icon: 'font-awesome:fa-calendar-o'}
	];
}

/**
 * Display the workload options
 *
 * @param      {project}  project  The project
 * @return     {Array}
 */
function listWorkLoadOptions(project) {
	const faces = ["😶", "🤨", "😐", "😀", "😉", "😆", "🤪", "🤩", "🥳"];
	const options = [];
	faces.forEach((face, index) => {
		const option = {
			title: `Set work hour to ${index}h`,
			// icon: `font-awesome:fa-thermometer-${Math.min(index, 4)}`,
			icon: face,
			label: index === faces.length - 1 ? 'Press <Enter> to change' : undefined,
			actionRunsInBackground: true,
			action: 'setWorkHour',
			actionArgument: {
				project: project,
				hours: index
			},
			actionReturnsItems: false
		};
		options.unshift(option);
	});
	return options;
}

/**
 * Sets the work hour of a prohect.
 *
 * @param      {{project: Project, hours: number}}  data    The data
 */
function setWorkHour(data) {
	const {project, hours} = data;
	const body = {
		'EmployeeId': project.EmployeeId,
		'PurchaseOrderId': project.PurchaseOrderId,
		'ProjectItemId': project.ProjectItemId,
		'Username': Action.preferences.DisplayName,
		'Title': '',
		'Description': '',
		'Hours': hours
	};

	const request = makeRequest(`${HOST}/WorkHoursApi/SetWorkHour`, {
		method: 'POST',
		body: body,
		bodyType: 'json'
	});
	const result = HTTP.loadRequest(request).data;

	const notification = {title: 'IEMS'};

	if (result === "") {
		notification.subtitle = `Work hour has been changed to ${hours}h 🎉`;
	} else {
		notification.subtitle = `Unable to change work hour 😳`;
		notification.string = result;
	}

	LaunchBar.displayNotification(notification);
}

/**
 * The entry point of the action
 *
 * @param      {string | string[]}  argument  The argument
 * @return     {Array}
 */
function run(argument) {
    if (!Action.preferences.UserName || !Action.preferences.PassWord) {
		Action.preferences.UserName = '';
		Action.preferences.PassWord = '';
		return PREFERENCE;
    }

    if (!Action.preferences.CRMAppToken || LaunchBar.options.commandKey) {
		const result = login();
		if (result !== true) {
			return [{title: result, icon: 'font-awesome:fa-warning'}]
		}
    }

    return listProjects();
}