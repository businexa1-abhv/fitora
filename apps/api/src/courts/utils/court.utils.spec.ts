import { BadRequestException } from '@nestjs/common';
import { validateAmenities, validateCoordinates, validatePincode } from './court.utils';

describe('court.utils', () => {
  describe('validateAmenities', () => {
    it('accepts valid amenities', () => {
      expect(() => validateAmenities(['Parking', 'AC'])).not.toThrow();
    });

    it('rejects unknown amenities', () => {
      expect(() => validateAmenities(['Helipad'])).toThrow(BadRequestException);
    });

    it('rejects more than 20 amenities', () => {
      const many = Array.from({ length: 21 }, () => 'Parking');
      expect(() => validateAmenities(many)).toThrow(BadRequestException);
    });
  });

  describe('validateCoordinates', () => {
    it('requires both latitude and longitude', () => {
      expect(() => validateCoordinates(12.9, undefined)).toThrow(BadRequestException);
    });

    it('rejects out-of-range latitude', () => {
      expect(() => validateCoordinates(91, 77)).toThrow(BadRequestException);
    });
  });

  describe('validatePincode', () => {
    it('accepts valid 6-digit pincode', () => {
      expect(() => validatePincode('560038')).not.toThrow();
    });

    it('rejects invalid pincode', () => {
      expect(() => validatePincode('56003')).toThrow(BadRequestException);
    });
  });
});
