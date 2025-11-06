import { Controller } from '@nestjs/common';

@Controller('mqtt')
export class MqttController {
  // This controller can be used for MQTT-related HTTP endpoints if needed
  // For now, MQTT communication is handled entirely through the MqttService
}
