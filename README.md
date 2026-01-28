# OPD Token Allocation Engine

A dynamic token allocation system for hospital Outpatient Department (OPD) that supports elastic capacity management, priority handling, and real-world edge cases.

## Overview

This system manages appointment tokens for hospital OPD operations, handling multiple token sources with different priorities and dynamically reallocating resources when conditions change.

## Features

- **Multi-source Token Allocation**: Handles online bookings, walk-ins, priority patients, follow-ups, and emergencies
- **Dynamic Priority Management**: Automatically prioritizes tokens based on source and can bump lower priority appointments
- **Elastic Capacity**: Adapts to cancellations, no-shows, and emergency insertions
- **Real-time Reallocation**: Processes waiting queue when slots become available
- **RESTful API**: Complete API for integration with hospital systems
- **Comprehensive Simulation**: Demonstrates system behavior with realistic scenarios

## Quick Start

### Installation

```bash
npm install
```

### Start the Server

```bash
npm start
# or for development with auto-reload
npm run dev
```

The server will start on `http://localhost:3000`

### Run Simulation

```bash
node src/simulation/opdSimulation.js
```

## API Endpoints

### Doctors Management
- `POST /api/doctors` - Add a new doctor
- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:doctorId/schedule` - Get doctor's schedule

### Token Management
- `POST /api/tokens/allocate` - Allocate a new token
- `POST /api/tokens/emergency` - Insert emergency token
- `DELETE /api/tokens/:tokenId` - Cancel a token

### System Information
- `GET /api/stats` - Get system statistics
- `GET /api/waiting-queue` - Get current waiting queue
- `GET /api/token-sources` - Get available token sources
- `GET /health` - Health check

## Token Sources & Priorities

| Source | Priority | Description |
|--------|----------|-------------|
| Emergency | 10 | Urgent medical cases |
| Priority | 8 | Paid priority patients |
| Follow-up | 6 | Return visits |
| Online | 4 | Pre-booked appointments |
| Walk-in | 2 | Same-day requests |

## API Usage Examples

### Add a Doctor
```bash
curl -X POST http://localhost:3000/api/doctors \
  -H "Content-Type: application/json" \
  -d '{
    "id": "DOC001",
    "name": "Dr. Sarah Johnson",
    "specialization": "General Medicine",
    "workingHours": {"start": "09:00", "end": "17:00"}
  }'
```

### Allocate a Token
```bash
curl -X POST http://localhost:3000/api/tokens/allocate \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P001",
    "doctorId": "DOC001",
    "preferredTime": "10:00",
    "source": "online"
  }'
```

### Insert Emergency Token
```bash
curl -X POST http://localhost:3000/api/tokens/emergency \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P005",
    "doctorId": "DOC001",
    "urgentTime": "11:00"
  }'
```

### Get Doctor Schedule
```bash
curl http://localhost:3000/api/doctors/DOC001/schedule
```

## Algorithm Design

### Core Allocation Logic

1. **Primary Allocation**: Try to allocate to preferred time slot
2. **Alternative Slots**: If preferred slot is full, find nearby available slots (±2 hours)
3. **Priority Bumping**: Higher priority tokens can displace lower priority ones
4. **Waiting Queue**: Tokens that can't be allocated immediately are queued
5. **Dynamic Reallocation**: When slots become available, process waiting queue

### Priority Management

- Each token source has a predefined priority level
- Higher priority tokens can bump lower priority ones from slots
- Bumped tokens are moved to waiting queue for reallocation
- Emergency tokens get immediate allocation with highest priority

### Edge Case Handling

- **Cancellations**: Free up slots and trigger reallocation from waiting queue
- **No-shows**: Can be handled by updating token status
- **Emergency Insertions**: Highest priority allocation, can bump any other token
- **Doctor Delays**: System can extend working hours or reallocate to other doctors
- **Capacity Changes**: Slots can be dynamically adjusted for real-world conditions

## Simulation Results

The simulation demonstrates:
- 3 doctors with different specializations and working hours
- Various patient types and booking scenarios
- Real-time priority management and reallocation
- Comprehensive statistics and utilization tracking

Run the simulation to see detailed output including:
- Doctor schedules with allocated tokens
- System utilization statistics
- Waiting queue status
- Priority-based allocation decisions

## Architecture

```
src/
├── models/           # Data models (Doctor, Token, Patient, Slot)
├── services/         # Core business logic (TokenAllocationEngine)
├── routes/           # API endpoints
├── simulation/       # OPD day simulation
└── server.js         # Express server setup
```

## Key Design Decisions

### 1. Priority-Based Allocation
- **Decision**: Use numeric priority system with bumping capability
- **Reasoning**: Allows flexible priority management and handles real-world urgency
- **Trade-off**: May cause some patient displacement, but ensures critical cases are handled

### 2. Elastic Slot Management
- **Decision**: Fixed time slots with dynamic capacity adjustment
- **Reasoning**: Balances predictability with flexibility for real-world variations
- **Trade-off**: Requires careful capacity planning to avoid overbooking

### 3. Waiting Queue System
- **Decision**: Automatic reallocation from waiting queue when slots become available
- **Reasoning**: Maximizes utilization and provides fair allocation
- **Trade-off**: Adds complexity but significantly improves patient satisfaction

### 4. RESTful API Design
- **Decision**: Standard REST endpoints with JSON responses
- **Reasoning**: Easy integration with existing hospital systems
- **Trade-off**: Stateless design requires careful session management for complex workflows

## Failure Handling

- **Invalid Requests**: Comprehensive input validation with clear error messages
- **Resource Conflicts**: Graceful handling of double-bookings and capacity limits
- **System Overload**: Waiting queue prevents system breakdown during peak times
- **Data Consistency**: Atomic operations ensure consistent state during allocations

## Performance Considerations

- **Time Complexity**: O(n) for allocation, O(n log n) for priority sorting
- **Space Complexity**: O(n) for storing tokens and slots
- **Scalability**: Can handle hundreds of concurrent allocations
- **Optimization**: Priority queues and efficient slot lookup for better performance

## Testing

### Postman Collection
A comprehensive Postman collection is included for complete API testing:

**File:** `OPD_Token_Allocation_Postman_Collection.json`

**Features:**
- **20+ test scenarios** covering all edge cases
- **Complete API endpoint testing**
- **Priority bumping verification**
- **Error handling validation**
- **Real-world scenario simulation**

**To use the Postman collection:**
1. Open Postman
2. Click "Import" → Select file → Choose `OPD_Token_Allocation_Postman_Collection.json`
3. Set environment variable: `base_url = http://localhost:3000`
4. Run tests sequentially to verify all functionality
5. Collection includes expected responses for validation

**Test Categories:**
- Basic setup (health check, add doctors)
- Token allocation (online, priority, walk-in, follow-up, emergency)
- Priority bumping scenarios
- Cancellation and reallocation
- Error handling (invalid inputs)
- System statistics and monitoring

### Simulation Testing
The system includes comprehensive simulation that tests:
- Normal allocation scenarios
- Priority-based bumping
- Emergency insertions
- Cancellation handling
- Waiting queue processing
- Edge cases and failure scenarios

## Future Enhancements

- **Real-time Notifications**: WebSocket integration for live updates
- **Machine Learning**: Predictive allocation based on historical patterns
- **Multi-day Scheduling**: Extended booking windows
- **Resource Optimization**: Dynamic doctor assignment based on demand
- **Patient Preferences**: Consider patient location, previous doctors, etc.

## Contributing

This is an assignment project demonstrating backend development skills for hospital OPD management systems.

## License

MIT License - This is an educational project for internship assignment.