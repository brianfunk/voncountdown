/**
 * Mock utilities for testing
 */

/**
 * Mock AWS DynamoDB client
 */
exports.mockDynamoDBClient = {
	send: jest.fn()
};

/**
 * Mock Twitter API client
 */
exports.mockTwitterClient = {
	v2: {
		tweet: jest.fn()
	}
};

/**
 * Mock countdown state
 */
exports.mockCountdownState = {
	current_number: 1111373357579,
	current_string: 'One trillion one hundred eleven billion three hundred seventy-three million three hundred fifty-seven thousand five hundred seventy-nine!',
	current_comma: '1,111,373,357,579'
};

/**
 * Mock DynamoDB scan response
 */
exports.mockDynamoDBScanResponse = {
	Items: [
		{
			number: 1111373357579,
			string: 'One trillion one hundred eleven billion...',
			datetime: '2026-01-13T00:00:00.000Z',
			status: true
		}
	],
	Count: 1,
	ScannedCount: 1
};

/**
 * Mock Twitter API response
 */
exports.mockTwitterResponse = {
	data: {
		id: '1234567890',
		text: 'Test tweet'
	}
};
